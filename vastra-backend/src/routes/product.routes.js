const express = require('express');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', async (req, res) => {
  try {
    const {
      q, category, minPrice, maxPrice, occasion, color,
      sort, page = 1, limit = 12,
      featured, newArrival, bestseller,
      inStock,
    } = req.query;

    const filter = { isActive: true };

    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    if (occasion) filter.occasion = { $in: [occasion] };
    if (color) filter.colors = { $in: [color] };
    if (featured) filter.featured = true;
    if (newArrival) filter.newArrival = true;
    if (bestseller) filter.bestseller = true;
    if (String(inStock) === 'true') filter.stock = { $gt: 0 };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sortMap = {
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      rating: { rating: -1 },
      newest: { createdAt: -1 },
      default: { featured: -1, rating: -1 },
    };
    const sortBy = sortMap[sort] || sortMap.default;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortBy).skip(skip).limit(Number(limit)).select('-stockHistory -reviews'),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/meta', async (req, res) => {
  try {
    const [categories, colors, occasions, priceStats] = await Promise.all([
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$colors' },
        { $group: { _id: '$colors', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$occasion' },
        { $group: { _id: '$occasion', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
      ]),
    ]);

    res.json({
      success: true,
      meta: {
        categories,
        colors,
        occasions,
        priceRange: {
          min: priceStats[0]?.min || 0,
          max: priceStats[0]?.max || 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/search-suggestions', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, suggestions: [] });

    const regex = new RegExp(escapeRegex(q), 'i');
    const products = await Product.find({
      isActive: true,
      $or: [
        { name: regex },
        { category: regex },
        { tags: regex },
        { colors: regex },
        { occasion: regex },
      ],
    })
      .sort({ featured: -1, bestseller: -1, rating: -1, createdAt: -1 })
      .limit(6)
      .select('name category price images slug');

    const suggestions = products.map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.images?.[0] || '',
      slug: product.slug || '',
    }));

    res.json({ success: true, suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const cats = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name');
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, message: 'Product created.', product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated.', product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/stock', protect, adminOnly, async (req, res) => {
  try {
    const { change, reason, ref } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.stock + change < 0) {
      return res.status(400).json({ success: false, message: 'Stock cannot go below 0.' });
    }
    product.updateStock(Number(change), reason || 'manual', ref || 'admin');
    await product.save();
    res.json({ success: true, message: `Stock updated. New stock: ${product.stock}`, stock: product.stock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product removed from listing.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ success: false, message: 'Review comment is required.' });
    }
    if (!Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const already = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ success: false, message: 'You have already reviewed this product.' });
    product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment: String(comment).trim() });
    product.calcRating();
    await product.save();
    await product.populate('reviews.user', 'name');
    res.status(201).json({
      success: true,
      message: 'Review added.',
      rating: product.rating,
      reviewCount: product.reviewCount,
      product,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/related', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    }).limit(4).select('-stockHistory -reviews');
    res.json({ success: true, products: related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
