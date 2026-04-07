const mongoose = require('mongoose');

const foodListingSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    restaurantName: {
      type: String,
      required: true
    },
    restaurantLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    foodName: {
      type: String,
      required: true,
      trim: true
    },
    foodType: {
      type: String,
      enum: ['cooked', 'raw', 'packaged', 'dairy', 'bakery', 'mixed'],
      required: true
    },
    foodCategory: {
      type: String,
      enum: ['veg', 'non-veg', 'vegan'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    quantityUnit: {
      type: String,
      enum: ['kg', 'litres', 'portions', 'boxes'],
      required: true
    },
    preparedAt: {
      type: Date,
      required: true
    },
    storageTemperature: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true
    },
    season: {
      type: String,
      enum: ['summer', 'winter', 'monsoon', 'spring'],
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    safetyScore: {
      type: Number,
      default: 0
    },
    predictedExpiryTime: Date,
    safeConsumptionWindowHours: Number,
    currentCategory: {
      type: String,
      enum: ['human', 'animal', 'industry', 'expired'],
      default: 'human'
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'picked_up', 'expired'],
      default: 'available'
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    claimedAt: Date,
    pickedUpAt: Date,
    verifiedByNGO: {
      type: Boolean,
      default: false
    },
    ngoVerificationNote: {
      type: String,
      default: ''
    },
    humanExpiryTime: Date,
    animalExpiryTime: Date
  },
  {
    timestamps: true
  }
);

foodListingSchema.index({ restaurantLocation: '2dsphere' });
foodListingSchema.index({ currentCategory: 1, status: 1, predictedExpiryTime: 1 });

module.exports = mongoose.model('FoodListing', foodListingSchema);

