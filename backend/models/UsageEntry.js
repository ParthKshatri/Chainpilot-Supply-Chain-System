const mongoose = require('mongoose');

const usageEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  notes: { type: String, trim: true },
  source: {
    type: String,
    enum: ['manual', 'csv_upload', 'xml_upload', 'api'],
    default: 'manual'
  }
}, { timestamps: true });

// Compound index to prevent duplicate entries per day per material
usageEntrySchema.index({ userId: 1, materialId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UsageEntry', usageEntrySchema);
