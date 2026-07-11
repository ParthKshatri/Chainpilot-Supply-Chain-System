const express   = require('express');
const router    = express.Router();
const fetch     = require('node-fetch');
const auth      = require('../middleware/auth');
const Prediction    = require('../models/Prediction');
const UsageEntry    = require('../models/UsageEntry');
const Material      = require('../models/Material');
const CalendarEvent = require('../models/CalendarEvent');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// GET /api/predictions
router.get('/', auth, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.user._id })
      .populate('materialId', 'name unit currentStock')
      .sort({ recommendedResupplyDate: 1 });
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/predictions/comparison/:materialId
router.get('/comparison/:materialId', auth, async (req, res) => {
  try {
    const pred = await Prediction.findOne({ userId: req.user._id, materialId: req.params.materialId });
    if (!pred) return res.status(404).json({ success: false, message: 'No prediction found' });
    res.json({ success: true, data: pred.modelsCompared || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/predictions/generate/:materialId
router.post('/generate/:materialId', auth, async (req, res) => {
  try {
    const material = await Material.findOne({ _id: req.params.materialId, userId: req.user._id });
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });

    const usageData = await UsageEntry.find({
      userId: req.user._id,
      materialId: req.params.materialId,
    }).sort({ date: 1 });

    if (usageData.length < 3) {
      return res.status(400).json({ success: false, message: 'Need at least 3 usage data points' });
    }

    const mlPayload = {
      material_id:    req.params.materialId,
      material_name:  material.name,
      current_stock:  material.currentStock,
      lead_time_days: material.leadTimeDays || 7,
      forecast_days:  90,
      use_ensemble:   true,
      usage_data: usageData.map(u => ({
        date:     u.date.toISOString().split('T')[0],
        quantity: u.quantity,
      })),
    };

    let mlResult;
    try {
      const mlResponse = await fetch(`${ML_URL}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(mlPayload),
        timeout: 120000,
      });
      if (!mlResponse.ok) {
        const err = await mlResponse.json().catch(() => ({}));
        throw new Error(err.detail || `ML service returned ${mlResponse.status}`);
      }
      mlResult = await mlResponse.json();
    } catch (mlError) {
      console.error('ML service error:', mlError.message);
      mlResult = simpleFallback(material, usageData);
    }

    // Delete old prediction
    await Prediction.deleteMany({ userId: req.user._id, materialId: req.params.materialId });

    // Build models compared array
    const modelsCompared = (mlResult.models_compared || []).map(m => ({
      modelName:     m.model_name,
      success:       m.success,
      trainingTimeS: m.training_time_s,
      mae:           m.mae,
      rmse:          m.rmse,
      mape:          m.mape,
      confidence:    m.confidence,
      cvFolds:       m.cv_folds,
      isBest:        m.is_best,
      error:         m.error,
    }));

    const prediction = await Prediction.create({
      userId:      req.user._id,
      materialId:  req.params.materialId,
      materialName: material.name,

      predictedDailyUsage:      mlResult.predicted_daily_usage,
      estimatedStockoutDate:    mlResult.stockout_date   ? new Date(mlResult.stockout_date)  : null,
      recommendedResupplyDate:  mlResult.resupply_date   ? new Date(mlResult.resupply_date)  : null,
      recommendedOrderQuantity: mlResult.recommended_order_quantity,
      confidence:               mlResult.confidence,
      trend:                    mlResult.trend,

      bestModel:      mlResult.best_model || mlResult.model_used,
      usedEnsemble:   mlResult.used_ensemble || false,
      ensembleTopN:   mlResult.ensemble_top_n || 1,
      modelsCompared: modelsCompared,
      dataPoints:     mlResult.data_points || usageData.length,

      forecastData: (mlResult.forecast_data || []).map(d => ({
        date:           new Date(d.date),
        predictedStock: d.predicted_stock,
        predictedUsage: d.predicted_usage,
        lowerBound:     d.lower_bound,
        upperBound:     d.upper_bound,
      })),

      modelUsed:  mlResult.model_used || 'pipeline',
      trainedOn:  mlResult.data_points || usageData.length,
      generatedAt: new Date(),
    });

    // Update material
    await Material.findByIdAndUpdate(req.params.materialId, {
      nextResupplyDate:   prediction.recommendedResupplyDate,
      predictionConfidence: prediction.confidence,
    });

    // Auto-create/update calendar resupply event
    if (prediction.recommendedResupplyDate) {
      await CalendarEvent.findOneAndUpdate(
        { userId: req.user._id, materialId: req.params.materialId, isAutoGenerated: true, type: 'resupply' },
        {
          userId:      req.user._id,
          materialId:  req.params.materialId,
          title:       `Resupply: ${material.name}`,
          description: `${mlResult.used_ensemble ? 'Ensemble' : mlResult.best_model} · Confidence ${Math.round((prediction.confidence||0)*100)}% · MAPE ${modelsCompared.length > 0 ? modelsCompared.find(m=>m.isBest)?.mape?.toFixed(1)+'%' : 'n/a'}`,
          date:        prediction.recommendedResupplyDate,
          type:        'resupply',
          isAutoGenerated: true,
          color:       '#D97706',
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function simpleFallback(material, usageData) {
  const values  = usageData.slice(-30).map(u => u.quantity);
  const avg     = values.reduce((a,b)=>a+b,0) / values.length;
  const days    = avg > 0 ? Math.floor(material.currentStock / avg) : 999;
  const stockout = new Date(); stockout.setDate(stockout.getDate() + days);
  const resupply = new Date(stockout); resupply.setDate(resupply.getDate() - (material.leadTimeDays||7));
  if (resupply < new Date()) resupply.setDate(new Date().getDate()+1);
  return {
    best_model:                'linear_baseline',
    used_ensemble:             false,
    ensemble_top_n:            1,
    models_compared:           [],
    data_points:               usageData.length,
    trend:                     'stable',
    predicted_daily_usage:     avg,
    stockout_date:             stockout.toISOString().split('T')[0],
    resupply_date:             resupply.toISOString().split('T')[0],
    recommended_order_quantity: Math.round(avg * 37),
    confidence:                0.5,
    model_used:                'linear_baseline',
    forecast_data:             [],
  };
}

module.exports = router;
