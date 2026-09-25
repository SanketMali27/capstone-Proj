const mongoose = require('mongoose');

const ngoRequirementSchema = new mongoose.Schema({
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  foodType: { type: String, required: true, trim: true, lowercase: true },
  quantityRequired: { type: Number, required: true, min: 0 },
  quantityFulfilled: { type: Number, default: 0, min: 0 },
  quantityUnit: { type: String, enum: ['kg', 'litres', 'portions', 'boxes'], default: 'portions' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  status: { type: String, enum: ['active', 'paused', 'fulfilled'], default: 'active' }
}, { timestamps: true });

ngoRequirementSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('NGORequirement', ngoRequirementSchema);
