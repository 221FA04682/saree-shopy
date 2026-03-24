const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },  // auto-generated, NOT required
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  icon:        { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
  productCount:{ type: Number, default: 0 },
}, { timestamps: true });

// Auto-generate slug before BOTH save and validate (covers .create() too)
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

categorySchema.pre('validate', function (next) {
  // Always auto-generate slug from name — admin never needs to type it
  if (this.name) {
    this.slug = generateSlug(this.name);
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
