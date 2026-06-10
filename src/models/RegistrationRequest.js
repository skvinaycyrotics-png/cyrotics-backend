const mongoose = require('mongoose');

const registrationRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, required: true },
    company: { type: String, required: true, trim: true },
    roleRequested: { type: String, enum: ['client', 'admin'], default: 'client' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    createdUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: String,
  },
  { timestamps: true }
);

module.exports = mongoose.models.RegistrationRequest || mongoose.model('RegistrationRequest', registrationRequestSchema);
