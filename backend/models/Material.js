const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true
  },
  description: { type: String, trim: true },
  unit: { type: String, default: 'units' },
  category: { type: String, trim: true },
  supplier: { type: String, trim: true },
  leadTimeDays: { type: Number, default: 7, min: 0 },
  reorderPoint: { type: Number, default: 0, min: 0 },
  // Current inventory
  currentStock: { type: Number, default: 0, min: 0 },
  totalStorageCapacity: { type: Number, default: 0, min: 0 },
  // Daily usage tracking
  dailyUsage: { type: Number, default: 0, min: 0 },
  // Cost tracking
  unitCost: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'USD' },
  // Linked products
  usedInProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: { type: Boolean, default: true },
  lastRestocked: Date,
  nextResupplyDate: Date,
  predictionConfidence: Number
}, { timestamps: true });

materialSchema.index({ userId: 1, name: 1 });

// Virtual: days until stockout
materialSchema.virtual('daysUntilStockout').get(function() {
  if (this.dailyUsage <= 0) return null;
  return Math.floor(this.currentStock / this.dailyUsage);
});

// Virtual: stock percentage
materialSchema.virtual('stockPercentage').get(function() {
  if (this.totalStorageCapacity <= 0) return 0;
  return Math.round((this.currentStock / this.totalStorageCapacity) * 100);
});

materialSchema.set('toJSON', { virtuals: true });
materialSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Material', materialSchema);
