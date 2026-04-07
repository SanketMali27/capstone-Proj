const express = require('express');
const multer = require('multer');
const path = require('path');
const FoodListing = require('../models/FoodListing');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { calculateSafetyScore } = require('../utils/safetyModel');
const { findNearbyUsers, getRelevantRolesForCategory } = require('../utils/geoMatch');
const { createNotification, emitToRoleRoom } = require('../utils/notificationService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

const upload = multer({ storage });

const roomMap = {
  human: 'ngo-room',
  animal: 'animal-room',
  industry: 'industry-room'
};

const categoryRoleMap = {
  human: ['ngo'],
  animal: ['animal_husbandry'],
  industry: ['industry']
};

const getDistanceKm = (from, to) => {
  if (!from?.coordinates?.length || !to?.coordinates?.length) {
    return null;
  }

  const [lon1, lat1] = from.coordinates;
  const [lon2, lat2] = to.coordinates;
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadius * c).toFixed(2));
};

router.get('/claimed/mine', auth, roleCheck('ngo', 'animal_husbandry', 'industry'), async (req, res) => {
  try {
    const listings = await FoodListing.find({ claimedBy: req.user._id }).sort({ claimedAt: -1 });
    return res.json({
      success: true,
      data: listings,
      message: 'Claimed food fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch claimed food'
    });
  }
});

router.post('/', auth, roleCheck('restaurant'), upload.array('images', 5), async (req, res) => {
  try {
    const payload = req.body;
    const images = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const preparedAt = payload.preparedAt ? new Date(payload.preparedAt) : new Date();

    const safetyData = calculateSafetyScore({
      foodType: payload.foodType,
      storageTemperature: Number(payload.storageTemperature),
      humidity: Number(payload.humidity),
      preparedAt,
      season: payload.season
    });

    const listing = await FoodListing.create({
      restaurantId: req.user._id,
      restaurantName: req.user.organizationName || req.user.name,
      restaurantLocation: req.user.location,
      foodName: payload.foodName,
      foodType: payload.foodType,
      foodCategory: payload.foodCategory,
      quantity: Number(payload.quantity),
      quantityUnit: payload.quantityUnit,
      preparedAt,
      storageTemperature: Number(payload.storageTemperature),
      humidity: Number(payload.humidity),
      season: payload.season,
      description: payload.description,
      images,
      safetyScore: safetyData.safetyScore,
      predictedExpiryTime: safetyData.predictedExpiryTime,
      safeConsumptionWindowHours: safetyData.safeConsumptionWindowHours,
      currentCategory: safetyData.currentCategory,
      humanExpiryTime: safetyData.humanExpiryTime,
      animalExpiryTime: safetyData.animalExpiryTime
    });

    const relevantRoles = getRelevantRolesForCategory(listing.currentCategory);
    const nearbyUsers = await findNearbyUsers(req.user.location, relevantRoles, 10000, 5);

    await Promise.all(
      nearbyUsers.map((recipient) =>
        createNotification({
          recipientId: recipient._id,
          recipientRole: recipient.role,
          type: 'new_listing',
          message: `New ${listing.currentCategory} listing nearby: ${listing.foodName} from ${listing.restaurantName}`,
          foodListingId: listing._id
        })
      )
    );

    if (roomMap[listing.currentCategory]) {
      emitToRoleRoom(roomMap[listing.currentCategory], {
        action: 'new',
        category: listing.currentCategory,
        listingId: listing._id
      });
    }

    return res.status(201).json({
      success: true,
      data: listing,
      message: `Your listing has been classified as: ${listing.currentCategory.toUpperCase()} and is now visible to relevant receivers`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to create food listing'
    });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { foodType, radius, minQuantity, maxQuantity, sortBy = 'expiry', currentCategory } = req.query;
    const categoryByRole = {
      ngo: 'human',
      animal_husbandry: 'animal',
      industry: 'industry'
    };

    const category = currentCategory || categoryByRole[req.user.role];
    const query = { status: 'available' };

    if (category) {
      query.currentCategory = category;
    }

    if (foodType) {
      query.foodType = foodType;
    }

    if (minQuantity || maxQuantity) {
      query.quantity = {};
      if (minQuantity) {
        query.quantity.$gte = Number(minQuantity);
      }
      if (maxQuantity) {
        query.quantity.$lte = Number(maxQuantity);
      }
    }

    if (radius && req.user.location?.coordinates?.length) {
      query.restaurantLocation = {
        $near: {
          $geometry: req.user.location,
          $maxDistance: Number(radius) * 1000
        }
      };
    }

    const sort = sortBy === 'nearest' ? {} : { predictedExpiryTime: 1, createdAt: -1 };
    const listings = await FoodListing.find(query).sort(sort).populate('claimedBy', 'name organizationName role');

    const data = listings.map((listing) => ({
      ...listing.toObject(),
      distanceKm: getDistanceKm(req.user.location, listing.restaurantLocation)
    }));

    return res.json({
      success: true,
      data,
      message: 'Available listings fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch listings'
    });
  }
});

router.get('/restaurant', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const listings = await FoodListing.find({ restaurantId: req.user._id }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: listings,
      message: 'Restaurant listings fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch restaurant listings'
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const listing = await FoodListing.findById(req.params.id)
      .populate('claimedBy', 'name organizationName role phone')
      .populate('restaurantId', 'name organizationName phone address');

    if (!listing) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Food listing not found'
      });
    }

    return res.json({
      success: true,
      data: {
        ...listing.toObject(),
        distanceKm: getDistanceKm(req.user.location, listing.restaurantLocation)
      },
      message: 'Food listing fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch listing'
    });
  }
});

router.put('/:id/claim', auth, roleCheck('ngo', 'animal_husbandry', 'industry'), async (req, res) => {
  try {
    const listing = await FoodListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Food listing not found'
      });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Listing is no longer available'
      });
    }

    const allowedRoles = categoryRoleMap[listing.currentCategory] || [];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: {},
        message: 'This listing is not available for your role'
      });
    }

    listing.status = 'claimed';
    listing.claimedBy = req.user._id;
    listing.claimedAt = new Date();
    await listing.save();

    await createNotification({
      recipientId: listing.restaurantId,
      recipientRole: 'restaurant',
      type: 'claimed',
      message: `${req.user.organizationName || req.user.name} claimed your listing: ${listing.foodName}`,
      foodListingId: listing._id
    });

    return res.json({
      success: true,
      data: listing,
      message: 'Listing claimed successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to claim listing'
    });
  }
});

router.put('/:id/pickup-verify', auth, roleCheck('ngo'), async (req, res) => {
  try {
    const { isFoodInGoodCondition, notes } = req.body;
    const listing = await FoodListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Food listing not found'
      });
    }

    if (!listing.claimedBy || String(listing.claimedBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        data: {},
        message: 'Only the claiming NGO can verify pickup'
      });
    }

    listing.status = 'picked_up';
    listing.pickedUpAt = new Date();
    listing.verifiedByNGO = Boolean(isFoodInGoodCondition);
    listing.ngoVerificationNote = notes || '';
    await listing.save();

    await createNotification({
      recipientId: listing.restaurantId,
      recipientRole: 'restaurant',
      type: 'pickup_confirmed',
      message: `${req.user.organizationName || req.user.name} confirmed pickup for ${listing.foodName}`,
      foodListingId: listing._id
    });

    return res.json({
      success: true,
      data: listing,
      message: 'Pickup verified successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to verify pickup'
    });
  }
});

router.delete('/:id', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const listing = await FoodListing.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.user._id
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Food listing not found'
      });
    }

    return res.json({
      success: true,
      data: {},
      message: 'Food listing deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to delete listing'
    });
  }
});

module.exports = router;

