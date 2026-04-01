const express = require('express');
const HomeConfig = require('../models/HomeConfig');
const Product    = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

async function getConfig() {
  let cfg = await HomeConfig.findOne({ singleton: 'home' });
  if (!cfg) cfg = await HomeConfig.create({ singleton: 'home' });
  return cfg;
}

// ── GET /api/homeconfig  (public) ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const cfg = await getConfig();

    // Featured products: admin-picked first, fallback to featured:true
    let featuredProducts = [];
    if (cfg.featuredProductIds && cfg.featuredProductIds.length > 0) {
      featuredProducts = await Product.find({
        _id: { $in: cfg.featuredProductIds },
        isActive: true,
      }).select('-stockHistory -reviews').limit(8);
    }
    if (featuredProducts.length === 0) {
      featuredProducts = await Product.find({ featured: true, isActive: true })
        .sort({ rating: -1 }).limit(4).select('-stockHistory -reviews');
    }

    // New arrivals
    let newArrivals = [];
    if (cfg.newArrivalsMode === 'manual' && cfg.newArrivalProductIds && cfg.newArrivalProductIds.length > 0) {
      newArrivals = await Product.find({
        _id: { $in: cfg.newArrivalProductIds },
        isActive: true,
      }).select('-stockHistory -reviews').limit(8);
    } else {
      newArrivals = await Product.find({ newArrival: true, isActive: true })
        .sort({ createdAt: -1 }).limit(4).select('-stockHistory -reviews');
    }

    const bestsellers = await Product.find({ bestseller: true, isActive: true })
      .sort({ rating: -1, reviewCount: -1 }).limit(4).select('-stockHistory -reviews');

    res.json({ success: true, config: cfg, featuredProducts, newArrivals, bestsellers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/homeconfig/admin  (admin only) ───────────────────
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const cfg = await getConfig();
    // Return ObjectIds as plain strings so frontend can compare easily
    const plain = cfg.toObject();
    plain.featuredProductIds   = (plain.featuredProductIds   || []).map(id => id.toString());
    plain.newArrivalProductIds = (plain.newArrivalProductIds || []).map(id => id.toString());
    res.json({ success: true, config: plain });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/homeconfig  (admin only) ─────────────────────────
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const cfg = await getConfig();
    const allowed = [
      'announcementText', 'announcementActive',
      'heroTitle', 'heroSubtitle', 'heroCTA', 'heroImage',
      'heroSidebarCards',
      'featuredProductIds', 'newArrivalsMode', 'newArrivalProductIds',
      'promoBannerTitle', 'promoBannerSubtitle', 'promoBannerText',
      'promoBannerBadge', 'promoBannerOfferLabel', 'promoBannerOfferSub',
      'promoBannerImage', 'promoBannerLink', 'promoBannerCTA', 'promoBannerActive',
    ];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) cfg[key] = req.body[key];
    });
    cfg.updatedBy = req.user._id;
    // Use markModified for nested arrays so Mongoose detects the change
    cfg.markModified('featuredProductIds');
    cfg.markModified('newArrivalProductIds');
    cfg.markModified('heroSidebarCards');
    await cfg.save();

    const plain = cfg.toObject();
    plain.featuredProductIds   = (plain.featuredProductIds   || []).map(id => id.toString());
    plain.newArrivalProductIds = (plain.newArrivalProductIds || []).map(id => id.toString());
    res.json({ success: true, message: 'Homepage updated!', config: plain });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
