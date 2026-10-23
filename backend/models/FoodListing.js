const mongoose = require('mongoose');

const foodListingSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantName: { type: String, required: true },
  restaurantLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  foodName: { type: String, required: true, trim: true },
  foodType: { type: String, enum: ['cooked', 'raw', 'packaged', 'dairy', 'bakery', 'mixed'], required: true },
  foodCategory: { type: String, enum: ['veg', 'non-veg', 'vegan'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  quantityUnit: { type: String, enum: ['kg', 'litres', 'portions', 'boxes'], required: true },
  description: { type: String, default: '' },
  images: { type: [String], default: [] },
  intendedRecipientType: { type: String, enum: ['human', 'animal', 'industry'], required: true, default: 'human' },
  priorityScore: { type: Number, min: 0, max: 100, default: 0 },
  urgencyLevel: { type: String, enum: ['URGENT', 'HIGH', 'MEDIUM', 'NORMAL'], default: 'NORMAL' },
  priorityFactors: {
    waitingTimeScore: { type: Number, default: 0 },
    demandMatchScore: { type: Number, default: 0 },
    distanceScore: { type: Number, default: 0 },
    quantityScore: { type: Number, default: 0 },
    pickupAvailabilityScore: { type: Number, default: 0 },
    waitingMinutes: { type: Number, default: 0 },
    nearestDistanceKm: { type: Number, default: null },
    matchingRequirementCount: { type: Number, default: 0 }
  },
  pickupAvailableFrom: { type: Date, default: Date.now },
  pickupAvailableUntil: { type: Date, default: null },
  status: { type: String, enum: ['available', 'requested', 'claimed', 'pickup_pending', 'completed', 'cancelled'], default: 'available' },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  requestedAt: Date,
  claimedAt: Date,
  pickedUpAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  pickupNote: { type: String, default: '' },
  expiredAt: { type: Date, default: null }
}, { timestamps: true });

foodListingSchema.index({ restaurantLocation: '2dsphere' });
foodListingSchema.index({ intendedRecipientType: 1, status: 1, priorityScore: -1 });

module.exports = mongoose.model('FoodListing', foodListingSchema);
