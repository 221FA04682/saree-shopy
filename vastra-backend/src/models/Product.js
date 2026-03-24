const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category:    { type: String, required: true, trim: true },
  fabric:      { type: String, required: true },
  origin:      { type: String, required: true },
  occasion:    [{ type: String }],
  colors:      [{ type: String }],
  length:      { type: String, default: '6.3m' },
  blouseIncluded: { type: Boolean, default: true },
  tags:        [{ type: String }],

  price:         { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  discount:      { type: Number, default: 0 },

  images:      [{ type: String }],

  stock:       { type: Number, required: true, min: 0, default: 10 },
  sku:         { type: String, unique: true, sparse: true },

  rating:      { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  reviews:     [reviewSchema],

  featured:    { type: Boolean, default: false },
  newArrival:  { type: Boolean, default: false },
  bestseller:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },

  // Stock history for admin dashboard
  stockHistory: [{
    date:     { type: Date, default: Date.now },
    change:   { type: Number },  // +10 = restock, -2 = sold
    reason:   { type: String },  // 'sale', 'restock', 'manual'
    ref:      { type: String },  // order ID or admin note
  }],
}, { timestamps: true });

// Auto-calc discount when prices set
productSchema.pre('save', function (next) {
  if (this.originalPrice && this.originalPrice > this.price) {
    this.discount = Math.round((1 - this.price / this.originalPrice) * 100);
  } else {
    this.discount = 0;
  }
  next();
});

// Recalculate rating from reviews
productSchema.methods.calcRating = function () {
  if (this.reviews.length === 0) { this.rating = 0; this.reviewCount = 0; return; }
  const total = this.reviews.reduce((s, r) => s + r.rating, 0);
  this.rating = Math.round((total / this.reviews.length) * 10) / 10;
  this.reviewCount = this.reviews.length;
};

// Update stock with history
productSchema.methods.updateStock = function (change, reason, ref) {
  this.stock += change;
  this.stockHistory.push({ change, reason, ref });
};

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1, rating: -1 });

module.exports = mongoose.model('Product', productSchema);
