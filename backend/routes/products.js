const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const Material = require('../models/Material');

// GET /api/products
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/products
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, sku, category, materials, productionCycle } = req.body;

    const product = await Product.create({
      userId: req.user._id,
      name,
      description,
      sku,
      category,
      materials: materials || [],
      productionCycle
    });

    // Create material entries if they don't exist yet
    for (const mat of materials || []) {
      const existingMaterial = await Material.findOne({
        userId: req.user._id,
        name: { $regex: new RegExp(`^${mat.materialName}$`, 'i') }
      });

      if (!existingMaterial) {
        await Material.create({
          userId: req.user._id,
          name: mat.materialName,
          unit: mat.unit || 'units',
          usedInProducts: [product._id]
        });
      } else {
        await Material.findByIdAndUpdate(existingMaterial._id, {
          $addToSet: { usedInProducts: product._id }
        });
      }
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
