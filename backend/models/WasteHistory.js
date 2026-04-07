const mongoose = require('mongoose');

const wasteHistorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    dayOfWeek: {
      type: String,
      required: true
    },
    season: {
      type: String,
      required: true
    },
    foodItems: [
      {
        foodName: String,
        foodType: String,
        quantityPrepared: Number,
        quantityWasted: Number,
        quantityClaimed: Number
      }
    ],
    totalWasted: {
      type: Number,
      default: 0
    },
    totalClaimed: {
      type: Number,
      default: 0
    },
    weatherCondition: {
      type: String,
      default: ''
    },
    specialEvent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

module.exports = mongoose.model('WasteHistory', wasteHistorySchema);

