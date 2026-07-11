const mongoose = require('mongoose');

const modelResultSchema = new mongoose.Schema({
  modelName:     String,
  success:       Boolean,
  trainingTimeS: Number,
  mae:           Number,
  rmse:          Number,
  mape:          Number,
  confidence:    Number,
  cvFolds:       Number,
  isBest:        Boolean,
  error:         String,
}, { _id: false });

const predictionSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
  materialName: String,

  // Final outputs
  predictedDailyUsage:      { type: Number, required: true },
  estimatedStockoutDate:    Date,
  recommendedResupplyDate:  Date,
  recommendedOrderQuantity: Number,
  confidence:               { type: Number, min: 0, max: 1 },
  trend:                    { type: String, enum: ['increasing','decreasing','stable','volatile'] },

  // Multi-model pipeline info
  bestModel:       String,
  usedEnsemble:    { type: Boolean, default: false },
  ensembleTopN:    Number,
  modelsCompared:  [modelResultSchema],
  dataPoints:      Number,

  // Chart data
  forecastData: [{ date: Date, predictedStock: Number, predictedUsage: Number, lowerBound: Number, upperBound: Number }],

  modelUsed:    { type: String, default: 'pipeline' },
  trainedOn:    Number,
  generatedAt:  { type: Date, default: Date.now },
  isStale:      { type: Boolean, default: false },
}, { timestamps: true });

predictionSchema.index({ userId: 1, materialId: 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
