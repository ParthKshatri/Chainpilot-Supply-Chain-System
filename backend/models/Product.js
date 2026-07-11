const mongoose = require('mongoose');

const materialRequirementSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  },
  materialName: { type: String, required: true },
  quantityPerUnit: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'units' }
});

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: { type: String, trim: true },
  sku: { type: String, trim: true },
  category: { type: String, trim: true },
  materials: [materialRequirementSchema],
  productionCycle: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'monthly'
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Product', productSchema);
