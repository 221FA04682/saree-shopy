const mongoose = require('mongoose');

const homeConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: 'home', unique: true },

  // Announcement bar
  announcementText:   { type: String, default: '✦ Free Shipping on orders above ₹10,000 · Use code VASTRA15 for 15% off ✦' },
  announcementActive: { type: Boolean, default: true },

  // Hero section
  heroTitle:    { type: String, default: 'Where Heritage Meets Haute Couture' },
  heroSubtitle: { type: String, default: "Exquisite handcrafted sarees woven by India's most celebrated artisans." },
  heroCTA:      { type: String, default: 'Explore Collection' },
  heroImage:    { type: String, default: '' },

  // Hero sidebar cards (the 3 small images on the right of the hero)
  heroSidebarCards: {
    type: [{
      cat:   { type: String, default: '' },
      image: { type: String, default: '' },
    }],
    default: [
      { cat: 'Banarasi',   image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&q=80' },
      { cat: 'Kanjivaram', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300&q=80' },
      { cat: 'Chanderi',   image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=300&q=80' },
    ],
  },

  // Featured products — admin-picked IDs (empty = auto from featured:true flag)
  featuredProductIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // New arrivals — auto or manual
  newArrivalsMode:      { type: String, enum: ['auto', 'manual'], default: 'auto' },
  newArrivalProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // Promo banner (editorial section)
  promoBannerTitle:   { type: String, default: 'Bridal Season Sale' },
  promoBannerSubtitle:{ type: String, default: 'Bridal Season 2024' },
  promoBannerText:    { type: String, default: 'Up to 30% off on our exclusive bridal collection.' },
  promoBannerBadge:   { type: String, default: '30%' },
  promoBannerOfferLabel: { type: String, default: 'Bridal Season Sale' },
  promoBannerOfferSub:   { type: String, default: 'On selected bridal & festive pieces' },
  promoBannerImage:   { type: String, default: '' },
  promoBannerLink:    { type: String, default: '/products?occasion=Wedding' },
  promoBannerCTA:     { type: String, default: 'Shop Bridal →' },
  promoBannerActive:  { type: Boolean, default: true },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('HomeConfig', homeConfigSchema);
