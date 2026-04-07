const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: notifications,
      message: 'Notifications fetched successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to fetch notifications'
    });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        data: {},
        message: 'Notification not found'
      });
    }

    return res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message || 'Failed to update notification'
    });
  }
});

module.exports = router;

