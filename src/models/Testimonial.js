const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    content: { type: String, required: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);
