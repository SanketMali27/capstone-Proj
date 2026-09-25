const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const NGORequirement = require('../models/NGORequirement');

const router = express.Router();
router.use(auth, roleCheck('ngo'));

router.post('/', async (req, res) => {
  try {
    const { foodType, quantityRequired, quantityUnit, status, coordinates } = req.body;
    const requirement = await NGORequirement.create({
      ngo: req.user._id, foodType, quantityRequired: Number(quantityRequired), quantityUnit,
      status: status || 'active', location: { type: 'Point', coordinates: Array.isArray(coordinates) ? coordinates : req.user.location.coordinates }
    });
    res.status(201).json({ success: true, data: requirement, message: 'Requirement created' });
  } catch (error) { res.status(400).json({ success: false, data: {}, message: error.message || 'Failed to create requirement' }); }
});

router.get('/', async (req, res) => {
  try {
    const requirements = await NGORequirement.find({ ngo: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: requirements, message: 'Requirements fetched' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to fetch requirements' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['foodType', 'quantityRequired', 'quantityUnit', 'status', 'coordinates'];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (update.coordinates) { update.location = { type: 'Point', coordinates: update.coordinates }; delete update.coordinates; }
    const requirement = await NGORequirement.findOneAndUpdate({ _id: req.params.id, ngo: req.user._id }, update, { new: true, runValidators: true });
    if (!requirement) return res.status(404).json({ success: false, data: {}, message: 'Requirement not found' });
    res.json({ success: true, data: requirement, message: 'Requirement updated' });
  } catch (error) { res.status(400).json({ success: false, data: {}, message: error.message || 'Failed to update requirement' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const requirement = await NGORequirement.findOneAndDelete({ _id: req.params.id, ngo: req.user._id });
    if (!requirement) return res.status(404).json({ success: false, data: {}, message: 'Requirement not found' });
    res.json({ success: true, data: {}, message: 'Requirement deleted' });
  } catch (error) { res.status(500).json({ success: false, data: {}, message: error.message || 'Failed to delete requirement' }); }
});

module.exports = router;
