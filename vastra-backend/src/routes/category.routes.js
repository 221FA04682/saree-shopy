const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// ── GET /api/categories ─── Public: list active categories ───
router.get('/', async (req, res) => {
  try {
    const cats = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });

    // Attach live product counts
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id] = c.count; });

    const result = cats.map(c => ({ ...c.toObject(), productCount: countMap[c.name] || 0 }));
    res.json({ success: true, categories: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/categories/all ─── Admin: all including inactive ─
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const cats = await Category.find().sort({ sortOrder: 1, name: 1 });
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id] = c.count; });
    const result = cats.map(c => ({ ...c.toObject(), productCount: countMap[c.name] || 0 }));
    res.json({ success: true, categories: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/categories ─── Admin: create category ──────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, image, icon, sortOrder } = req.body;
    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: `Category "${name}" already exists.` });
    const cat = await Category.create({ name, description, image, icon, sortOrder: sortOrder || 0 });
    res.status(201).json({ success: true, message: `Category "${name}" created.`, category: cat });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PUT /api/categories/:id ─── Admin: update ─────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.json({ success: true, message: 'Category updated.', category: cat });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/categories/:id/toggle ─── Admin: toggle active ─
router.patch('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
    cat.isActive = !cat.isActive;
    await cat.save();
    res.json({ success: true, message: `Category ${cat.isActive ? 'activated' : 'hidden'}.`, isActive: cat.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/categories/:id ─── Admin: delete ─────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
    const count = await Product.countDocuments({ category: cat.name, isActive: true });
    if (count > 0) return res.status(400).json({ success: false, message: `Cannot delete — ${count} active products use this category. Reassign them first.` });
    await cat.deleteOne();
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
