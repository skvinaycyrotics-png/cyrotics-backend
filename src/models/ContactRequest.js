const mongoose = require('mongoose');

const contactRequestSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'read', 'replied'], default: 'pending' },
    ipAddress: String,
  },
  { timestamps: true }
);

module.exports = mongoose.models.ContactRequest || mongoose.model('ContactRequest', contactRequestSchema);
