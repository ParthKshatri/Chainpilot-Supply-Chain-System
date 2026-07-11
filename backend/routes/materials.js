const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Material = require('../models/Material');

// GET /api/materials
router.get('/', auth, async (req, res) => {
  try {
    const materials = await Material.find({ userId: req.user._id, isActive: true })
      .populate('usedInProducts', 'name')
      .sort({ name: 1 });
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/materials
router.post('/', auth, async (req, res) => {
  try {
    const material = await Material.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/materials/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const material = await Material.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('usedInProducts', 'name');
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    res.json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/materials/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const material = await Material.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    res.json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/materials/:id/stock - Update stock levels specifically
router.patch('/:id/stock', auth, async (req, res) => {
  try {
    const { currentStock, totalStorageCapacity, dailyUsage } = req.body;
    const update = {};
    if (currentStock !== undefined) update.currentStock = currentStock;
    if (totalStorageCapacity !== undefined) update.totalStorageCapacity = totalStorageCapacity;
    if (dailyUsage !== undefined) update.dailyUsage = dailyUsage;

    const material = await Material.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true }
    );
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    res.json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/materials/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Material.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false }
    );
    res.json({ success: true, message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
