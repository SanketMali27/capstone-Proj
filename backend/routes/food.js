const express = require('express');
const multer = require('multer');
const path = require('path');
const FoodListing = require('../models/FoodListing');
const NGORequirement = require('../models/NGORequirement');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { calculateRedistributionPriority, haversineKm } = require('../utils/redistributionPriority');
const { createNotification, emitToRoleRoom } = require('../utils/notificationService');


const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({ storage });
const roleByIntent = { human: 'ngo', animal: 'animal_husbandry', industry: 'industry' };
const roomByIntent = { human: 'ngo-room', animal: 'animal-room', industry: 'industry-room' };
const intentByRole = { ngo: 'human', animal_husbandry: 'animal', industry: 'industry' };

const recalculatePriority = async (listing) => {
  const role = roleByIntent[listing.intendedRecipientType];
  const recipients = await User.find({ role }).select('location');
  const requirements = listing.intendedRecipientType === 'human'
    ? await NGORequirement.find({ status: 'active' }).lean()
    : [];
  Object.assign(listing, calculateRedistributionPriority({ listing, requirements, recipients }));
  return listing;
};

router.get('/claimed/mine', auth, roleCheck('ngo', 'animal_husbandry', 'industry'), async (req, res) => {
  try {
    const listings = await FoodListing.find({ claimedBy: req.user._id, status: { $in: ['requested', 'claimed', 'pickup_pending', 'completed'] } }).sort({ requestedAt: -1 });
    res.json({ success: true, data: listings, message: 'Requested donations fetched successfully' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to fetch donations' }); }
});

router.post('/', auth, roleCheck('restaurant'), upload.array('images', 5), async (req, res) => {
  try {
    const payload = req.body;
    const intendedRecipientType = payload.intendedRecipientType || 'human';
    if (!roleByIntent[intendedRecipientType]) return res.status(400).json({ success: false, data: {}, message: 'Choose a valid intended recipient type' });
    const listing = await FoodListing.create({
      restaurantId: req.user._id, restaurantName: req.user.organizationName || req.user.name, restaurantLocation: req.user.location,
      foodName: payload.foodName, foodType: payload.foodType, foodCategory: payload.foodCategory,
      quantity: Number(payload.quantity), quantityUnit: payload.quantityUnit, description: payload.description,
      images: (req.files || []).map((file) => `/uploads/${file.filename}`), intendedRecipientType,
      pickupAvailableFrom: payload.pickupAvailableFrom ? new Date(payload.pickupAvailableFrom) : new Date(),
      pickupAvailableUntil: payload.pickupAvailableUntil ? new Date(payload.pickupAvailableUntil) : null
    });
    await recalculatePriority(listing);
    await listing.save();
    emitToRoleRoom(roomByIntent[intendedRecipientType], { action: 'new', event: 'NEW_RELEVANT_DONATION', listingId: listing._id });
    const role = roleByIntent[intendedRecipientType];
    let recipients = await User.find({ role }).select('_id role location');
    const requirements = intendedRecipientType === 'human' ? await NGORequirement.find({ status: 'active', foodType: listing.foodType, quantityUnit: listing.quantityUnit }).select('ngo') : [];
    const relevantIds = new Set(requirements.map((requirement) => String(requirement.ngo)));
    recipients = recipients.filter((recipient) => {
      const distance = haversineKm(listing.restaurantLocation, recipient.location);
      return distance !== null && distance <= 50 && (intendedRecipientType !== 'human' || relevantIds.has(String(recipient._id)));
    });
    await Promise.all(recipients.map((recipient) => createNotification({
      recipientId: recipient._id, recipientRole: recipient.role, type: 'new_relevant_donation',
      message: `${listing.urgencyLevel.toLowerCase()} priority donation available: ${listing.foodName}.`, foodListingId: listing._id
    })));
    res.status(201).json({ success: true, data: listing, message: 'Donation created and redistribution priority calculated' });
  } catch (error) { res.status(400).json({ success: false, data: {}, message: error.message || 'Failed to create donation' }); }
});

router.get('/', auth, roleCheck('ngo', 'animal_husbandry', 'industry'), async (req, res) => {
  try {
    const { foodType, radius, minQuantity, maxQuantity, minPriorityScore, maxPriorityScore, sortBy = 'priority', urgency, demandMatch } = req.query;
    const intendedRecipientType = intentByRole[req.user.role];
    const query = { status: 'available', intendedRecipientType };
    if (foodType) query.foodType = foodType;
    if (urgency) query.urgencyLevel = String(urgency).toUpperCase();
    if (demandMatch === 'true') query['priorityFactors.demandMatchScore'] = { $gt: 0 };
    if (minPriorityScore || maxPriorityScore) {
      query.priorityScore = {};
      if (minPriorityScore) query.priorityScore.$gte = Number(minPriorityScore);
      if (maxPriorityScore) query.priorityScore.$lte = Number(maxPriorityScore);
    }
    if (minQuantity || maxQuantity) {
      query.quantity = {};
      if (minQuantity) query.quantity.$gte = Number(minQuantity);
      if (maxQuantity) query.quantity.$lte = Number(maxQuantity);
    }
    if (radius && req.user.location?.coordinates?.length === 2 && req.user.location.coordinates.some((coordinate) => coordinate !== 0)) {
      query.restaurantLocation = { $near: { $geometry: req.user.location, $maxDistance: Number(radius) * 1000 } };
    }
    const sort = sortBy === 'distance' ? {} : sortBy === 'quantity' ? { quantity: -1 } : sortBy === 'demand' ? { 'priorityFactors.demandMatchScore': -1, priorityScore: -1 } : { priorityScore: -1, createdAt: 1 };
    const listings = await FoodListing.find(query).sort(sort).populate('claimedBy', 'name organizationName role');
    const data = listings.map((listing) => {
      const distance = haversineKm(req.user.location, listing.restaurantLocation);
      return { ...listing.toObject(), distanceKm: distance === null ? null : Number(distance.toFixed(2)) };
    });
    if (sortBy === 'urgency') {
      const rank = { URGENT: 0, HIGH: 1, MEDIUM: 2, NORMAL: 3 };
      data.sort((a, b) => rank[a.urgencyLevel] - rank[b.urgencyLevel] || b.priorityScore - a.priorityScore);
    }
    res.json({ success: true, data, message: 'Available donations fetched successfully' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to fetch donations' }); }
});

router.get('/restaurant', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const listings = await FoodListing.find({ restaurantId: req.user._id, intendedRecipientType: { $in: ['human', 'animal', 'industry'] } }).sort({ createdAt: -1 }).populate('claimedBy', 'name organizationName role');
    res.json({ success: true, data: listings, message: 'Restaurant donations fetched successfully' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to fetch donations' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const listing = await FoodListing.findById(req.params.id).populate('claimedBy', 'name organizationName role phone').populate('restaurantId', 'name organizationName phone address');
    if (!listing) return res.status(404).json({ success: false, data: {}, message: 'Donation not found' });
    const ownerId = listing.restaurantId?._id || listing.restaurantId;
    if (req.user.role === 'restaurant' && String(ownerId) !== String(req.user._id)) return res.status(403).json({ success: false, data: {}, message: 'This donation belongs to another donor' });
    if (req.user.role !== 'admin' && req.user.role !== 'restaurant' && intentByRole[req.user.role] !== listing.intendedRecipientType) return res.status(403).json({ success: false, data: {}, message: 'This donation is not intended for your organization type' });
    res.json({ success: true, data: { ...listing.toObject(), distanceKm: haversineKm(req.user.location, listing.restaurantLocation) }, message: 'Donation fetched successfully' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to fetch donation' }); }
});

router.put('/:id', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const listing = await FoodListing.findOne({ _id: req.params.id, restaurantId: req.user._id, status: { $in: ['available', 'requested'] } });

    if (!listing) return res.status(404).json({ success: false, data: {}, message: 'Active donation not found' });
    const { foodName, foodType, foodCategory, quantity, quantityUnit, description, intendedRecipientType, pickupAvailableFrom, pickupAvailableUntil } = req.body;
    if (intendedRecipientType && !roleByIntent[intendedRecipientType]) return res.status(400).json({ success: false, data: {}, message: 'Choose a valid intended recipient type' });
    const previousIntent = listing.intendedRecipientType;
    Object.assign(listing, Object.fromEntries(Object.entries({ foodName, foodType, foodCategory, quantity: quantity === undefined ? undefined : Number(quantity), quantityUnit, description, intendedRecipientType, pickupAvailableFrom, pickupAvailableUntil }).filter(([, value]) => value !== undefined)));
    if (listing.status === 'requested' && intendedRecipientType && intendedRecipientType !== previousIntent) {
      listing.status = 'available'; listing.claimedBy = null; listing.requestedAt = null;
    }
    await recalculatePriority(listing);
    await listing.save();
    emitToRoleRoom(roomByIntent[listing.intendedRecipientType], { action: 'updated', listingId: listing._id });
    res.json({ success: true, data: listing, message: 'Donation updated' });
  } catch (error) { res.status(400).json({ success: false, data: {}, message: error.message || 'Failed to update donation' }); }
});

router.put('/:id/request', auth, roleCheck('ngo', 'animal_husbandry', 'industry'), async (req, res) => {
  try {
    const listing = await FoodListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, data: {}, message: 'Donation not found' });
    if (listing.status !== 'available') return res.status(400).json({ success: false, data: {}, message: 'Donation is no longer available' });
    if (intentByRole[req.user.role] !== listing.intendedRecipientType) return res.status(403).json({ success: false, data: {}, message: 'This donation is not intended for your organization type' });
    const requested = await FoodListing.findOneAndUpdate(
      { _id: req.params.id, status: 'available', intendedRecipientType: intentByRole[req.user.role] },
      { $set: { status: 'requested', claimedBy: req.user._id, requestedAt: new Date() } },
      { new: true }
    );
    if (!requested) return res.status(409).json({ success: false, data: {}, message: 'Donation is no longer available or has different intended use' });
    Object.assign(listing, requested.toObject());
    await createNotification({ recipientId: listing.restaurantId, recipientRole: 'restaurant', type: 'donation_requested', message: `${req.user.organizationName || req.user.name} requested ${listing.foodName}.`, foodListingId: listing._id });
    emitToRoleRoom('restaurant-room', { action: 'requested', event: 'DONATION_REQUESTED', listingId: listing._id });
    res.json({ success: true, data: listing, message: 'Donation request sent to the donor' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to request donation' }); }
});

router.put('/:id/claim', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const listing = await FoodListing.findOne({ _id: req.params.id, restaurantId: req.user._id, status: 'requested' });
    if (!listing) return res.status(404).json({ success: false, data: {}, message: 'Requested donation not found' });
    listing.status = 'claimed'; listing.claimedAt = new Date(); await listing.save();
    await createNotification({ recipientId: listing.claimedBy, recipientRole: roleByIntent[listing.intendedRecipientType], type: 'donation_claimed', message: `Your request for ${listing.foodName} was accepted.`, foodListingId: listing._id });
    emitToRoleRoom(roomByIntent[listing.intendedRecipientType], { action: 'claimed', event: 'DONATION_CLAIMED', listingId: listing._id });
    res.json({ success: true, data: listing, message: 'Donation request accepted' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to accept request' }); }
});

router.put('/:id/pickup-verify', auth, roleCheck('ngo', 'animal_husbandry', 'industry'), async (req, res) => {
  try {
    const listing = await FoodListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, data: {}, message: 'Donation not found' });
    if (String(listing.claimedBy) !== String(req.user._id) || listing.status !== 'claimed') return res.status(403).json({ success: false, data: {}, message: 'Only the accepted recipient can confirm pickup' });
    listing.status = 'completed'; listing.pickedUpAt = new Date(); listing.completedAt = new Date(); listing.pickupNote = req.body.notes || ''; await listing.save();
    if (req.user.role === 'ngo') {
      const requirements = await NGORequirement.find({ ngo: req.user._id, foodType: listing.foodType, quantityUnit: listing.quantityUnit, status: 'active' }).sort({ createdAt: 1 });
      let remaining = listing.quantity;
      for (const requirement of requirements) {
        if (remaining <= 0) break;
        const outstanding = Math.max(0, requirement.quantityRequired - requirement.quantityFulfilled);
        const fulfilledNow = Math.min(outstanding, remaining);
        requirement.quantityFulfilled += fulfilledNow;
        remaining -= fulfilledNow;
        if (requirement.quantityFulfilled >= requirement.quantityRequired) requirement.status = 'fulfilled';
        await requirement.save();
      }
    }
    await createNotification({ recipientId: listing.restaurantId, recipientRole: 'restaurant', type: 'donation_completed', message: `${req.user.organizationName || req.user.name} confirmed pickup of ${listing.foodName}.`, foodListingId: listing._id });
    emitToRoleRoom('restaurant-room', { action: 'completed', events: ['PICKUP_CONFIRMED', 'DONATION_COMPLETED'], listingId: listing._id });
    res.json({ success: true, data: listing, message: 'Pickup confirmed and donation completed' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to confirm pickup' }); }
});

router.delete('/:id', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const listing = await FoodListing.findOneAndUpdate({ _id: req.params.id, restaurantId: req.user._id, status: { $in: ['available', 'requested'] } }, { status: 'cancelled' }, { new: true });
    if (!listing) return res.status(404).json({ success: false, data: {}, message: 'Active donation not found' });
    res.json({ success: true, data: listing, message: 'Donation cancelled' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to cancel donation' }); }
});

module.exports = router;
