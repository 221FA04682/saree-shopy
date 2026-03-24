const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:  { type: String, required: true },
  productImage: { type: String },
  category:     { type: String },
  color:        { type: String },
  quantity:     { type: Number, required: true, min: 1 },
  price:        { type: Number, required: true },   // price at time of order
});

const shippingAddressSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  phone:   { type: String, required: true },
  street:  { type: String, required: true },
  city:    { type: String, required: true },
  state:   { type: String, required: true },
  pincode: { type: String, required: true },
}, { _id: false });

const trackingEventSchema = new mongoose.Schema({
  status:      { type: String, required: true },
  description: { type: String },
  location:    { type: String },
  timestamp:   { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  orderNumber:    { type: String, unique: true },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:       { type: String, required: true },
  userEmail:      { type: String, required: true },

  items:          [orderItemSchema],
  shippingAddress: shippingAddressSchema,

  subtotal:  { type: Number, required: true },
  shipping:  { type: Number, default: 0 },
  tax:       { type: Number, default: 0 },
  total:     { type: Number, required: true },

  paymentMethod:  { type: String, required: true },
  paymentStatus:  { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  paymentRef:     { type: String },

  status: {
    type: String,
    enum: ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned'],
    default: 'pending',
  },

  trackingNumber: { type: String },
  courier:        { type: String },
  trackingEvents: [trackingEventSchema],

  notes:       { type: String },
  cancelReason:{ type: String },

  estimatedDelivery: { type: Date },
  deliveredAt:       { type: Date },
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `VV${String(Date.now()).slice(-6)}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
