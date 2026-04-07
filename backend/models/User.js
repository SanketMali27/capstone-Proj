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
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);

