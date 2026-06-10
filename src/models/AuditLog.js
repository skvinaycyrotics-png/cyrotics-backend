const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    success: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
