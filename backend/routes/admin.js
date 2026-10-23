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
    const listings = await FoodListing.find({ intendedRecipientType: { $in: ['human', 'animal', 'industry'] } })
      .populate('restaurantId', 'name organizationName role phone address')
      .populate('claimedBy', 'name organizationName role phone')
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
    const [
      users,
      totalDonations,
      statusBreakdown,
      urgencyBreakdown,
      recipientBreakdown,
      timing,
      quantitySummary,
      pickupTiming,
      donorActivity,
      recipientActivity,
      wasteSummary,
      monthlyListingTrend
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      FoodListing.countDocuments({ intendedRecipientType: { $in: ['human', 'animal', 'industry'] } }),
      FoodListing.aggregate([
        { $match: { intendedRecipientType: { $in: ['human', 'animal', 'industry'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      FoodListing.aggregate([
        { $match: { intendedRecipientType: { $in: ['human', 'animal', 'industry'] } } },
        { $group: { _id: '$urgencyLevel', count: { $sum: 1 } } }
      ]),
      FoodListing.aggregate([
        { $match: { intendedRecipientType: { $in: ['human', 'animal', 'industry'] } } },
        { $group: { _id: '$intendedRecipientType', count: { $sum: 1 } } }
      ]),
      FoodListing.aggregate([
        {
          $match: {
            intendedRecipientType: { $in: ['human', 'animal', 'industry'] },
            claimedAt: { $ne: null },
            requestedAt: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            averageTimeToClaimMinutes: {
              $avg: { $divide: [{ $subtract: ['$claimedAt', '$createdAt'] }, 60000] }
            }
          }
        }
      ]),
      FoodListing.aggregate([
        { $match: { intendedRecipientType: { $in: ['human', 'animal', 'industry'] } } },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' },
            completedQuantity: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$quantity', 0] }
            }
          }
        }
      ]),
      FoodListing.aggregate([
        {
          $match: {
            intendedRecipientType: { $in: ['human', 'animal', 'industry'] },
            status: 'completed',
            pickedUpAt: { $ne: null },
            claimedAt: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            averagePickupMinutes: {
              $avg: { $divide: [{ $subtract: ['$pickedUpAt', '$claimedAt'] }, 60000] }
            }
          }
        }
      ]),
      // Donor activity: Top restaurants by listings
      FoodListing.aggregate([
        {
          $group: {
            _id: '$restaurantId',
            restaurantName: { $first: '$restaurantName' },
            totalListings: { $sum: 1 },
            completedListings: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            totalQuantity: { $sum: '$quantity' }
          }
        },
        { $sort: { totalListings: -1 } },
        { $limit: 5 }
      ]),
      // Recipient activity: Top recipients by claims/completed
      FoodListing.aggregate([
        { $match: { claimedBy: { $ne: null } } },
        {
          $group: {
            _id: '$claimedBy',
            totalClaimed: { $sum: 1 },
            completedPickups: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            name: '$user.name',
            organizationName: '$user.organizationName',
            role: '$user.role',
            totalClaimed: 1,
            completedPickups: 1
          }
        },
        { $sort: { totalClaimed: -1 } },
        { $limit: 5 }
      ]),
      // Verified waste history summary
      WasteHistory.aggregate([
        {
          $group: {
            _id: null,
            totalRecordedWasted: { $sum: '$totalWasted' },
            totalRecordedClaimed: { $sum: '$totalClaimed' }
          }
        }
      ]),
      // Monthly listing activity over last 6 months
      FoodListing.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
            }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            totalListings: { $sum: 1 },
            completedListings: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    const statusCount = Object.fromEntries(statusBreakdown.map(({ _id, count }) => [_id, count]));
    const unclaimed = await FoodListing.countDocuments({
      intendedRecipientType: { $in: ['human', 'animal', 'industry'] },
      status: 'available'
    });

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedTrends = monthlyListingTrend.map((item) => ({
      month: monthNames[item._id.month] || `${item._id.month}`,
      totalListings: item.totalListings,
      completedListings: item.completedListings
    }));

    return res.json({
      success: true,
      data: {
        userRoleBreakdown: users,
        totalDonations,
        statusBreakdown,
        urgencyBreakdown,
        recipientBreakdown,
        totalQuantity: quantitySummary[0]?.totalQuantity || 0,
        totalQuantityRedistributed: quantitySummary[0]?.completedQuantity || 0,
        averageTimeToClaimMinutes: Number((timing[0]?.averageTimeToClaimMinutes || 0).toFixed(1)),
        averagePickupMinutes: Number((pickupTiming[0]?.averagePickupMinutes || 0).toFixed(1)),
        unclaimed,
        counts: {
          available: statusCount.available || 0,
          requested: statusCount.requested || 0,
          claimed: statusCount.claimed || 0,
          pickup_pending: statusCount.pickup_pending || 0,
          completed: statusCount.completed || 0,
          cancelled: statusCount.cancelled || 0
        },
        donorActivity,
        recipientActivity,
        wasteSummary: {
          totalRecordedWasted: Number((wasteSummary[0]?.totalRecordedWasted || 0).toFixed(2)),
          totalRecordedClaimed: Number((wasteSummary[0]?.totalRecordedClaimed || 0).toFixed(2))
        },
        monthlyTrends: formattedTrends
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
