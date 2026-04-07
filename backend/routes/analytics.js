const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const WasteHistory = require('../models/WasteHistory');
const FoodListing = require('../models/FoodListing');
const { predictTomorrowWaste } = require('../utils/wastePredictionModel');

const router = express.Router();

router.get('/restaurant/waste-summary', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthlyHistory, sixMonthHistory, monthlyListings] = await Promise.all([
      WasteHistory.find({ restaurantId: req.user._id, date: { $gte: monthStart } }),
      WasteHistory.find({ restaurantId: req.user._id, date: { $gte: sixMonthsAgo } }).sort({ date: 1 }),
      FoodListing.find({ restaurantId: req.user._id, createdAt: { $gte: monthStart } })
    ]);

    const totalClaimed = monthlyHistory.reduce((sum, item) => sum + (item.totalClaimed || 0), 0);
    const totalWasted = monthlyHistory.reduce((sum, item) => sum + (item.totalWasted || 0), 0);
    const totalListed = monthlyListings.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const wasteReduction = totalListed ? Number((((totalClaimed / totalListed) * 100) || 0).toFixed(2)) : 0;

    const monthlyTrendMap = new Map();
    sixMonthHistory.forEach((item) => {
      const key = new Date(item.date).toLocaleString('default', { month: 'short' });
      const existing = monthlyTrendMap.get(key) || 0;
      monthlyTrendMap.set(key, existing + (item.totalWasted || 0));
    });

    const topWastedItems = monthlyHistory
      .flatMap((entry) =>
        entry.foodItems.map((item) => ({
          foodName: item.foodName,
          quantityWasted: item.quantityWasted || 0
        }))
      )
      .reduce((acc, item) => {
        acc[item.foodName] = (acc[item.foodName] || 0) + item.quantityWasted;
        return acc;
      }, {});

    const topWastedItemsList = Object.entries(topWastedItems)
      .map(([foodName, quantity]) => ({ foodName, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return res.json({
      success: true,
      data: {
        summary: {
          totalListed: Number(totalListed.toFixed(2)),
          totalClaimed: Number(totalClaimed.toFixed(2)),
          totalWasted: Number(totalWasted.toFixed(2)),
          wasteReductionPercentage: wasteReduction
        },
        monthlyTrend: Array.from(monthlyTrendMap.entries()).map(([month, waste]) => ({
          month,
          waste: Number(waste.toFixed(2))
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

router.get('/restaurant/prediction', auth, roleCheck('restaurant'), async (req, res) => {
  try {
    const prediction = await predictTomorrowWaste(req.user._id);
    return res.json({
      success: true,
      data: prediction,
      message: 'Waste prediction fetched successfully'
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

