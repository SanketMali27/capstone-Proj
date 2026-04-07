const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const User = require('../models/User');
const FoodListing = require('../models/FoodListing');
const WasteHistory = require('../models/WasteHistory');

const router = express.Router();

router.get('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: users,
      message: 'Users fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch users'
    });
  }
});

router.get('/listings', auth, roleCheck('admin'), async (req, res) => {
  try {
    const listings = await FoodListing.find()
      .populate('restaurantId', 'name organizationName role')
      .populate('claimedBy', 'name organizationName role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: listings,
      message: 'Listings fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch listings'
    });
  }
});

router.get('/stats', auth, roleCheck('admin'), async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [users, listingsToday, monthlyHistory, categoryBreakdown] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      FoodListing.countDocuments({ createdAt: { $gte: todayStart } }),
      WasteHistory.find({ date: { $gte: monthStart } }),
      FoodListing.aggregate([{ $group: { _id: '$currentCategory', count: { $sum: 1 } } }])
    ]);

    const totals = monthlyHistory.reduce(
      (acc, item) => {
        acc.claimed += item.totalClaimed || 0;
        acc.wasted += item.totalWasted || 0;
        return acc;
      },
      { claimed: 0, wasted: 0 }
    );

    return res.json({
      success: true,
      data: {
        userRoleBreakdown: users,
        totalListingsToday: listingsToday,
        claimedVsWastedThisMonth: totals,
        categoryBreakdown
      },
      message: 'Admin stats fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch admin stats'
    });
  }
});

module.exports = router;

