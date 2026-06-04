const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    mobile: { type: String, trim: true, maxlength: 15 },
    company: { type: String, trim: true, maxlength: 150 },
    designation: { type: String, trim: true, maxlength: 100 },
    password: { type: String, required: true, minlength: 8, select: false },

    role: {
      type: String,
      enum: ['admin', 'client', 'guest'],
      default: 'guest',
    },

    // Account lifecycle
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    // 2FA
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },

    // Password reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Session tracking
    lastLogin: { type: Date },
    lastLoginIP: { type: String },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Refresh tokens (store hashed)
    refreshTokens: [{ type: String, select: false }],

    // Client-specific custom dashboard config
    dashboardConfig: {
      showProjects: { type: Boolean, default: true },
      showTickets: { type: Boolean, default: true },
      showDocuments: { type: Boolean, default: true },
      showAnnouncements: { type: Boolean, default: true },
      customMessage: { type: String, maxlength: 500 },
      accentColor: { type: String, default: '#0ea5e9' },
    },

    avatar: { type: String },
    notes: { type: String, maxlength: 1000 }, // Admin-only notes about this user
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// ── Virtual: isLocked ────────────────────────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Pre-save: hash password ───────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Method: compare password ─────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Method: increment login attempts ─────────────────────────────────────────
userSchema.methods.incLoginAttempts = async function () {
  // Reset lockout if expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 min lockout
  }
  return this.updateOne(updates);
};

module.exports = mongoose.model('User', userSchema);
