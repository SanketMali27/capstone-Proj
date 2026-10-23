const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const WasteHistory = require('../models/WasteHistory');
const FoodListing = require('../models/FoodListing');
const { predictTomorrowWaste } = require('../utils/wastePredictionModel');

const router = express.Router();

/**
 * ============================================================================
 * RESTAURANT WASTE & REDISTRIBUTION SUMMARY
 * ============================================================================
 */
router.get('/restaurant/waste-summary', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthlyHistory, sixMonthHistory, monthlyListings, completedListings] = await Promise.all([
      WasteHistory.find({ restaurantId: req.user._id, date: { $gte: monthStart } }),
      WasteHistory.find({ restaurantId: req.user._id, date: { $gte: sixMonthsAgo } }).sort({ date: 1 }),
      FoodListing.find({ restaurantId: req.user._id, createdAt: { $gte: monthStart } }),
      FoodListing.find({ restaurantId: req.user._id, status: 'completed', createdAt: { $gte: monthStart } })
    ]);

    const totalClaimedFromHistory = monthlyHistory.reduce((sum, item) => sum + (Number(item.totalClaimed) || 0), 0);
    const totalClaimedFromListings = completedListings.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalClaimed = Math.max(totalClaimedFromHistory, totalClaimedFromListings);

    const totalWasted = monthlyHistory.reduce((sum, item) => sum + (Number(item.totalWasted) || 0), 0);
    const totalListed = monthlyListings.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalCompletedCount = completedListings.length;

    const wasteReduction = totalListed > 0
      ? Number((((totalClaimed / totalListed) * 100) || 0).toFixed(2))
      : 0;

    // Monthly trends (waste vs redistributed claimed)
    const monthlyTrendMap = new Map();
    // Initialize past 6 months in chronological order
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short' });
      monthlyTrendMap.set(key, { month: key, recordedWaste: 0, redistributedClaimed: 0 });
    }

    sixMonthHistory.forEach((item) => {
      const key = new Date(item.date).toLocaleString('default', { month: 'short' });
      if (monthlyTrendMap.has(key)) {
        const entry = monthlyTrendMap.get(key);
        entry.recordedWaste = Number((entry.recordedWaste + (Number(item.totalWasted) || 0)).toFixed(2));
        entry.redistributedClaimed = Number((entry.redistributedClaimed + (Number(item.totalClaimed) || 0)).toFixed(2));
      }
    });

    const topWastedItems = monthlyHistory
      .flatMap((entry) =>
        (entry.foodItems || []).map((item) => ({
          foodName: item.foodName || 'Unspecified',
          quantityWasted: Number(item.quantityWasted) || 0
        }))
      )
      .reduce((acc, item) => {
        acc[item.foodName] = (acc[item.foodName] || 0) + item.quantityWasted;
        return acc;
      }, {});

    const topWastedItemsList = Object.entries(topWastedItems)
      .map(([foodName, quantity]) => ({ foodName, quantity: Number(quantity.toFixed(2)) }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return res.json({
      success: true,
      data: {
        summary: {
          totalListed: Number(totalListed.toFixed(2)),
          totalCompletedCount,
          totalClaimed: Number(totalClaimed.toFixed(2)),
          totalWasted: Number(totalWasted.toFixed(2)),
          wasteReductionPercentage: wasteReduction
        },
        monthlyTrend: Array.from(monthlyTrendMap.values()).map((item) => ({
          ...item,
          waste: item.recordedWaste // Backward compatibility with existing chart
        })),
        topWastedItems: topWastedItemsList
      },
      message: 'Restaurant waste summary fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch waste summary'
    });
  }
});

/**
 * ============================================================================
 * LOG DAILY WASTE RECORD
 * ============================================================================
 */
router.post('/restaurant/waste-record', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const { date, foodItems = [], totalWasted, totalClaimed, specialEvent } = req.body;

    const recordDate = date ? new Date(date) : new Date();
    if (isNaN(recordDate.getTime())) {
      return res.status(400).json({
        success: false,
        data: {},
        message: 'Invalid date provided'
      });
    }

    const dayOfWeek = recordDate.toLocaleDateString('en-US', { weekday: 'long' });
    const computedTotalWasted = totalWasted !== undefined
      ? Number(totalWasted)
      : foodItems.reduce((sum, item) => sum + (Number(item.quantityWasted) || 0), 0);

    const computedTotalClaimed = totalClaimed !== undefined
      ? Number(totalClaimed)
      : foodItems.reduce((sum, item) => sum + (Number(item.quantityClaimed) || 0), 0);

    const newRecord = await WasteHistory.create({
      restaurantId: req.user._id,
      date: recordDate,
      dayOfWeek,
      foodItems,
      totalWasted: Math.max(0, computedTotalWasted || 0),
      totalClaimed: Math.max(0, computedTotalClaimed || 0),
      specialEvent: Boolean(specialEvent)
    });

    return res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Waste record logged successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to log waste record'
    });
  }
});

/**
 * ============================================================================
 * RULE-BASED WASTE PREDICTION & SURPLUS GUIDANCE
 * ============================================================================
 */
router.get('/restaurant/prediction', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const prediction = await predictTomorrowWaste(req.user._id);
    return res.json({
      success: true,
      data: prediction,
      message: 'Waste prediction guidance fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch waste prediction'
    });
  }
});

router.get('/restaurant/weekly-pattern', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const prediction = await predictTomorrowWaste(req.user._id);
    return res.json({
      success: true,
      data: prediction.weeklyPattern,
      message: 'Weekly waste pattern fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch weekly pattern'
    });
  }
});

module.exports = router;
