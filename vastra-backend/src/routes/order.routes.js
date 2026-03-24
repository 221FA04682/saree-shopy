const express = require('express');
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// ── POST /api/orders ─── Place new order ─────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    // Validate stock and calculate totals
    let subtotal = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product not available: ${item.productName}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${product.stock} left.`,
        });
      }
      subtotal += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images[0] || '',
        category: product.category,
        color: item.color || '',
        quantity: item.quantity,
        price: product.price,
      });
      stockUpdates.push({ product, quantity: item.quantity });
    }

    const shipping = subtotal >= 10000 ? 0 : 150;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + shipping + tax;

    // Estimate delivery: 5–7 business days
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 7);

    const order = await Order.create({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      items: orderItems,
      shippingAddress,
      subtotal, shipping, tax, total,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'pending' : 'paid',
      notes: notes || '',
      estimatedDelivery: estDelivery,
      trackingEvents: [{
        status: 'pending',
        description: 'Order placed successfully',
        location: 'Vastra Vaibhav Warehouse',
      }],
    });

    // Deduct stock from all products after order is created
    for (const { product, quantity } of stockUpdates) {
      product.updateStock(-quantity, 'sale', order.orderNumber);
      await product.save();
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        estimatedDelivery: order.estimatedDelivery,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/my ─── User's own orders ──────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments({ user: req.user._id }),
    ]);
    res.json({ success: true, orders, total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/my/:id ─── Single user order ─────────────
router.get('/my/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/my/:id/shipping-label ─── PDF Download ───
router.get('/my/:id/shipping-label', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Build PDF
    const doc = new PDFDocument({ margin: 40, size: 'A5' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=shipping-label-${order.orderNumber}.pdf`);
    doc.pipe(res);

    const W = 420; // A5 width in points

    // ── Header ──
    doc.rect(0, 0, W, 70).fill('#7b1e3a');
    doc.fillColor('white')
       .font('Helvetica-Bold').fontSize(18)
       .text('VASTRA VAIBHAV', 40, 20);
    doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.75)')
       .text('Premium Heritage Sarees · GI Certified', 40, 44);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
       .text(`ORDER: ${order.orderNumber}`, W - 180, 26);

    doc.moveDown();

    // ── Status Badge ──
    const statusColors = {
      delivered: '#2d7a4f', shipped: '#c9952a', confirmed: '#2563eb',
      processing: '#6b5447', pending: '#888', cancelled: '#c0392b',
    };
    const sc = statusColors[order.status] || '#888';
    doc.rect(40, 82, 100, 22).fill(sc);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
       .text(order.status.toUpperCase(), 42, 88, { width: 96, align: 'center' });

    doc.fillColor('#2c1810').font('Helvetica').fontSize(9)
       .text(`Placed: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })}`, 160, 88);

    if (order.estimatedDelivery) {
      doc.text(`Est. Delivery: ${new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })}`, 160, 100);
    }

    // ── Divider ──
    doc.moveTo(40, 115).lineTo(W - 40, 115).lineWidth(1).strokeColor('#e8c56a').stroke();

    // ── Shipping To ──
    doc.rect(40, 122, W - 80, 110).lineWidth(1).strokeColor('#e0d8ce').stroke();
    doc.rect(40, 122, W - 80, 20).fill('#f4ede3');
    doc.fillColor('#6b5447').font('Helvetica-Bold').fontSize(8)
       .text('SHIP TO', 50, 128, { characterSpacing: 1.5 });

    const addr = order.shippingAddress;
    doc.fillColor('#2c1810').font('Helvetica-Bold').fontSize(12)
       .text(addr.name, 50, 150);
    doc.font('Helvetica').fontSize(10)
       .text(addr.street, 50, 168)
       .text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 50, 182)
       .text(`📞 ${addr.phone}`, 50, 196);

    // ── Order Items ──
    doc.moveDown(0.5);
    const itemsY = 245;
    doc.rect(40, itemsY, W - 80, 18).fill('#f4ede3');
    doc.fillColor('#6b5447').font('Helvetica-Bold').fontSize(8)
       .text('ITEM', 50, itemsY + 5)
       .text('QTY', W - 160, itemsY + 5)
       .text('PRICE', W - 100, itemsY + 5);

    doc.moveTo(40, itemsY + 18).lineTo(W - 40, itemsY + 18).strokeColor('#e0d8ce').lineWidth(0.5).stroke();

    let y = itemsY + 24;
    order.items.forEach((item, i) => {
      if (i % 2 === 1) doc.rect(40, y - 3, W - 80, 18).fill('#faf8f4');
      doc.fillColor('#2c1810').font('Helvetica').fontSize(9)
         .text(item.productName.substring(0, 34), 50, y)
         .text(String(item.quantity), W - 160, y)
         .text(`₹${(item.price * item.quantity).toLocaleString('en-IN')}`, W - 100, y);
      y += 18;
    });

    // ── Totals ──
    doc.moveTo(40, y + 5).lineTo(W - 40, y + 5).strokeColor('#e8c56a').lineWidth(1).stroke();
    y += 12;
    doc.fillColor('#6b5447').font('Helvetica').fontSize(9)
       .text('Subtotal', W - 200, y)
       .text(`₹${order.subtotal.toLocaleString('en-IN')}`, W - 80, y, { align: 'right', width: 40 });
    y += 14;
    doc.text('Shipping', W - 200, y)
       .text(order.shipping === 0 ? 'FREE' : `₹${order.shipping}`, W - 80, y, { align: 'right', width: 40 });
    y += 14;
    doc.text('GST (5%)', W - 200, y)
       .text(`₹${order.tax.toLocaleString('en-IN')}`, W - 80, y, { align: 'right', width: 40 });
    y += 14;
    doc.rect(W - 210, y - 3, 170, 20).fill('#7b1e3a');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
       .text('TOTAL', W - 200, y + 1)
       .text(`₹${order.total.toLocaleString('en-IN')}`, W - 85, y + 1, { align: 'right', width: 45 });

    // ── Payment & Tracking ──
    y += 32;
    doc.fillColor('#2c1810').font('Helvetica').fontSize(8.5)
       .text(`Payment: ${order.paymentMethod} · ${order.paymentStatus.toUpperCase()}`, 40, y);
    if (order.trackingNumber) {
      doc.text(`Tracking: ${order.trackingNumber} (${order.courier || ''})`, 40, y + 14);
    }

    // ── Footer ──
    const footerY = doc.page.height - 60;
    doc.moveTo(0, footerY).lineTo(W, footerY).strokeColor('#e0d8ce').lineWidth(1).stroke();
    doc.fillColor('#a08878').font('Helvetica').fontSize(7.5)
       .text('Thank you for shopping with Vastra Vaibhav · support@vastrav.com · www.vastrav.com', 40, footerY + 10, { align: 'center', width: W - 80 })
       .text('This is a computer-generated document. No signature required.', 40, footerY + 23, { align: 'center', width: W - 80 });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/orders/my/:id/cancel ─── User cancel ──────────
router.post('/my/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel after order is shipped.' });
    }
    order.status = 'cancelled';
    order.cancelReason = req.body.reason || 'Cancelled by customer';
    order.trackingEvents.push({ status: 'cancelled', description: order.cancelReason });

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.updateStock(item.quantity, 'cancelled_return', order.orderNumber);
        await product.save();
      }
    }
    await order.save();
    res.json({ success: true, message: 'Order cancelled. Stock restored.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//   ADMIN ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET /api/orders/admin/all ─────────────────────────────────
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { orderNumber: new RegExp(q, 'i') },
        { userName:    new RegExp(q, 'i') },
        { userEmail:   new RegExp(q, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/admin/stats ───────────────────────────────
router.get('/admin/stats', protect, adminOnly, async (req, res) => {
  try {
    const [total, revenue, pending, delivered, todayOrders] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, sum: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
    ]);
    res.json({
      success: true,
      stats: {
        total,
        revenue: revenue[0]?.sum || 0,
        pending, delivered, todayOrders,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/orders/admin/:id/status ─── Update order status ──
router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, trackingNumber, courier, description, location } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (courier)        order.courier = courier;
    if (status === 'delivered') order.deliveredAt = new Date();

    order.trackingEvents.push({
      status,
      description: description || `Order ${status}`,
      location: location || 'Vastra Vaibhav Logistics',
    });

    await order.save();
    res.json({ success: true, message: `Order updated to "${status}".`, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/admin/:id/shipping-label ─── Admin PDF ───
router.get('/admin/:id/shipping-label', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    // Reuse same PDF logic - redirect to user route won't work, so inline it
    res.redirect(`/api/orders/my/${req.params.id}/shipping-label`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

// ── GET /api/orders/my/:id/invoice ─── User Invoice PDF ──────
router.get('/my/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    generateInvoicePDF(order, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/admin/:id/invoice ─── Admin Invoice PDF ──
router.get('/admin/:id/invoice', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    generateInvoicePDF(order, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/admin/:id/shipping-label ─── Admin Label ─
router.get('/admin/:id/print-label', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    generateShippingLabelPDF(order, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Helper: Generate Invoice PDF ──────────────────────────────
function generateInvoicePDF(order, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
  doc.pipe(res);

  const W = 595; // A4 width in points

  // ── Header band ──────────────────────────────────────────
  doc.rect(0, 0, W, 90).fill('#7b1e3a');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(22)
     .text('VASTRA VAIBHAV', 50, 28);
  doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.7)')
     .text('Premium Heritage Sarees · GI Certified', 50, 54);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(14)
     .text('TAX INVOICE', W - 160, 28);
  doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.8)')
     .text(`#${order.orderNumber}`, W - 160, 50)
     .text(new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }), W - 160, 64);

  let y = 110;

  // ── Bill To / Ship To ────────────────────────────────────
  doc.rect(50, y, 240, 115).lineWidth(1).strokeColor('#e8d5c0').stroke();
  doc.rect(315, y, 240, 115).lineWidth(1).strokeColor('#e8d5c0').stroke();

  doc.rect(50, y, 240, 22).fill('#f4ede3');
  doc.rect(315, y, 240, 22).fill('#f4ede3');

  doc.fillColor('#b8860b').font('Helvetica-Bold').fontSize(8)
     .text('BILL TO', 60, y + 7, { characterSpacing: 1.5 });
  doc.fillColor('#b8860b').font('Helvetica-Bold').fontSize(8)
     .text('SHIP TO', 325, y + 7, { characterSpacing: 1.5 });

  const addr = order.shippingAddress;
  doc.fillColor('#2c1810').font('Helvetica-Bold').fontSize(11)
     .text(order.userName, 60, y + 32)
     .text(addr.name, 325, y + 32);
  doc.font('Helvetica').fontSize(9).fillColor('#6b5447')
     .text(order.userEmail, 60, y + 48)
     .text(addr.street, 325, y + 48)
     .text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 325, y + 62)
     .text(`📞 ${addr.phone}`, 325, y + 76);

  y += 130;

  // ── Order meta ───────────────────────────────────────────
  doc.rect(50, y, W - 100, 38).fill('#fdf6e3').lineWidth(1).strokeColor('#e8d5c0').stroke();
  const metaItems = [
    ['Payment', order.paymentMethod],
    ['Payment Status', order.paymentStatus.toUpperCase()],
    ['Order Status', order.status.toUpperCase()],
  ];
  metaItems.forEach(([label, val], i) => {
    const mx = 70 + i * 165;
    doc.fillColor('#b8860b').font('Helvetica-Bold').fontSize(7)
       .text(label, mx, y + 8, { characterSpacing: 1 });
    doc.fillColor('#2c1810').font('Helvetica').fontSize(9)
       .text(val, mx, y + 20);
  });

  y += 52;

  // ── Items Table ──────────────────────────────────────────
  doc.rect(50, y, W - 100, 24).fill('#7b1e3a');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(8)
     .text('ITEM', 60, y + 8)
     .text('QTY', W - 230, y + 8)
     .text('UNIT PRICE', W - 175, y + 8)
     .text('AMOUNT', W - 95, y + 8, { align: 'right', width: 45 });

  y += 24;

  order.items.forEach((item, idx) => {
    if (idx % 2 === 1) doc.rect(50, y, W - 100, 26).fill('#faf8f4');
    doc.fillColor('#2c1810').font('Helvetica').fontSize(9)
       .text(item.productName.substring(0, 42), 60, y + 7)
       .text(String(item.quantity), W - 230, y + 7)
       .text(`₹${item.price.toLocaleString('en-IN')}`, W - 175, y + 7)
       .text(`₹${(item.price * item.quantity).toLocaleString('en-IN')}`, W - 95, y + 7, { align: 'right', width: 45 });
    doc.moveTo(50, y + 26).lineTo(W - 50, y + 26).strokeColor('#ede4d8').lineWidth(0.5).stroke();
    y += 26;
  });

  y += 8;

  // ── Totals ───────────────────────────────────────────────
  const totRows = [
    ['Subtotal', `₹${order.subtotal.toLocaleString('en-IN')}`],
    ['Shipping', order.shipping === 0 ? 'FREE' : `₹${order.shipping}`],
    ['GST (5%)', `₹${order.tax.toLocaleString('en-IN')}`],
  ];
  totRows.forEach(([label, val]) => {
    doc.fillColor('#6b5447').font('Helvetica').fontSize(9)
       .text(label, W - 200, y)
       .text(val, W - 95, y, { align: 'right', width: 45 });
    y += 16;
  });

  doc.rect(W - 210, y, 160, 28).fill('#7b1e3a');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
     .text('TOTAL', W - 200, y + 8)
     .text(`₹${order.total.toLocaleString('en-IN')}`, W - 95, y + 8, { align: 'right', width: 45 });

  y += 48;

  // ── Terms ────────────────────────────────────────────────
  doc.moveTo(50, y).lineTo(W - 50, y).strokeColor('#ede4d8').lineWidth(1).stroke();
  y += 12;
  doc.fillColor('#a08878').font('Helvetica').fontSize(7.5)
     .text('Terms & Conditions: All sales are final unless returned within 7 days of delivery. Products must be unused and in original packaging.', 50, y, { width: W - 100 })
     .text('For support: support@vastrav.com  |  www.vastrav.com', 50, y + 20, { align: 'center', width: W - 100 });

  // ── Gold ornament line ───────────────────────────────────
  const footerY = doc.page.height - 40;
  doc.rect(0, footerY, W, 40).fill('#7b1e3a');
  doc.fillColor('rgba(255,255,255,0.6)').font('Helvetica').fontSize(7)
     .text('Thank you for shopping with Vastra Vaibhav · This is a computer-generated invoice.', 50, footerY + 14, { align: 'center', width: W - 100 });

  doc.end();
}

// ── Helper: Generate Shipping Label PDF ──────────────────────
function generateShippingLabelPDF(order, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A5' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=label-${order.orderNumber}.pdf`);
  doc.pipe(res);

  const W = 420;

  doc.rect(0, 0, W, 70).fill('#7b1e3a');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(18)
     .text('VASTRA VAIBHAV', 40, 20);
  doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.75)')
     .text('SHIPPING LABEL · HANDLE WITH CARE', 40, 44);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
     .text(`ORDER: ${order.orderNumber}`, W - 180, 26);

  const statusColors = { delivered:'#2d7a4f', shipped:'#c9952a', confirmed:'#2563eb', pending:'#888', cancelled:'#c0392b' };
  const sc = statusColors[order.status] || '#888';
  doc.rect(40, 82, 100, 22).fill(sc);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
     .text(order.status.toUpperCase(), 42, 88, { width: 96, align: 'center' });
  doc.fillColor('#2c1810').font('Helvetica').fontSize(9)
     .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 160, 88);
  if (order.estimatedDelivery) {
    doc.text(`Est. Delivery: ${new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}`, 160, 101);
  }

  doc.moveTo(40, 116).lineTo(W - 40, 116).lineWidth(1).strokeColor('#e8c56a').stroke();

  doc.rect(40, 123, W - 80, 110).lineWidth(1).strokeColor('#e0d8ce').stroke();
  doc.rect(40, 123, W - 80, 20).fill('#f4ede3');
  doc.fillColor('#6b5447').font('Helvetica-Bold').fontSize(8)
     .text('SHIP TO', 50, 129, { characterSpacing: 1.5 });

  const addr = order.shippingAddress;
  doc.fillColor('#2c1810').font('Helvetica-Bold').fontSize(12).text(addr.name, 50, 151);
  doc.font('Helvetica').fontSize(10)
     .text(addr.street, 50, 169)
     .text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 50, 183)
     .text(`📞 ${addr.phone}`, 50, 197);

  let y = 246;
  doc.rect(40, y, W - 80, 18).fill('#f4ede3');
  doc.fillColor('#6b5447').font('Helvetica-Bold').fontSize(8)
     .text('ITEM', 50, y + 5)
     .text('QTY', W - 160, y + 5)
     .text('PRICE', W - 100, y + 5);
  y += 18;

  order.items.forEach((item, i) => {
    if (i % 2 === 1) doc.rect(40, y - 3, W - 80, 18).fill('#faf8f4');
    doc.fillColor('#2c1810').font('Helvetica').fontSize(9)
       .text(item.productName.substring(0, 34), 50, y)
       .text(String(item.quantity), W - 160, y)
       .text(`₹${(item.price * item.quantity).toLocaleString('en-IN')}`, W - 100, y);
    y += 18;
  });

  doc.moveTo(40, y + 5).lineTo(W - 40, y + 5).strokeColor('#e8c56a').lineWidth(1).stroke();
  y += 12;
  doc.fillColor('#6b5447').font('Helvetica').fontSize(9)
     .text('Shipping', W - 200, y)
     .text(order.shipping === 0 ? 'FREE' : `₹${order.shipping}`, W - 80, y, { align: 'right', width: 40 });
  y += 14;
  doc.rect(W - 210, y - 3, 170, 20).fill('#7b1e3a');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
     .text('TOTAL', W - 200, y + 1)
     .text(`₹${order.total.toLocaleString('en-IN')}`, W - 85, y + 1, { align: 'right', width: 45 });

  y += 32;
  doc.fillColor('#2c1810').font('Helvetica').fontSize(8.5)
     .text(`Payment: ${order.paymentMethod} · ${order.paymentStatus.toUpperCase()}`, 40, y);
  if (order.trackingNumber) {
    doc.text(`Tracking: ${order.trackingNumber} (${order.courier || ''})`, 40, y + 14);
  }

  const footerY = doc.page.height - 55;
  doc.moveTo(0, footerY).lineTo(W, footerY).strokeColor('#e0d8ce').lineWidth(1).stroke();
  doc.fillColor('#a08878').font('Helvetica').fontSize(7.5)
     .text('support@vastrav.com · www.vastrav.com', 40, footerY + 10, { align: 'center', width: W - 80 })
     .text('This is a computer-generated shipping label.', 40, footerY + 24, { align: 'center', width: W - 80 });

  doc.end();
}
