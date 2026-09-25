const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipientRole: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['new_relevant_donation', 'priority_increased', 'donation_requested', 'donation_claimed', 'pickup_confirmed', 'donation_completed'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    foodListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodListing',
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

module.exports = mongoose.model('Notification', notificationSchema);

