const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['restaurant', 'ngo', 'animal_husbandry', 'industry', 'admin'],
      required: true
    },
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    location: {
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
    organizationName: {
      type: String,
      default: ''
    },
    animalType: {
      type: String,
      default: ''
    },
    industryType: {
      type: String,
      default: ''
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    priorityPreferences: {
      waitingTime: { type: Number, default: 35 },
      demandMatch: { type: Number, default: 30 },
      distance: { type: Number, default: 20 },
      quantity: { type: Number, default: 10 },
      pickupAvailability: { type: Number, default: 5 }
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);

