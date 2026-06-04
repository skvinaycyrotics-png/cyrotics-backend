const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true, // Creates index automatically
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },

    mobile: {
      type: String,
      trim: true,
      maxlength: 15,
    },

    company: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    designation: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

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

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: Date,

    rejectionReason: String,

    // 2FA
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      select: false,
    },

    // Password reset
    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Session tracking
    lastLogin: Date,

    lastLoginIP: String,

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: Date,

    // Refresh tokens
    refreshTokens: [
      {
        type: String,
        select: false,
      },
    ],

    // Dashboard configuration
    dashboardConfig: {
      showProjects: {
        type: Boolean,
        default: true,
      },

      showTickets: {
        type: Boolean,
        default: true,
      },

      showDocuments: {
        type: Boolean,
        default: true,
      },

      showAnnouncements: {
        type: Boolean,
        default: true,
      },

      customMessage: {
        type: String,
        maxlength: 500,
      },

      accentColor: {
        type: String,
        default: '#0ea5e9',
      },
    },

    avatar: String,

    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// ─────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────

// REMOVE THIS:
// userSchema.index({ email: 1 });

userSchema.index({
  role: 1,
  status: 1,
});

userSchema.index({
  createdAt: -1,
});

// ─────────────────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────────────────

userSchema.virtual('isLocked').get(function () {
  return !!(
    this.lockUntil &&
    this.lockUntil > Date.now()
  );
});

// ─────────────────────────────────────────────────────────
// PASSWORD HASHING
// ─────────────────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(12);

    this.password = await bcrypt.hash(
      this.password,
      salt
    );

    next();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────
// METHODS
// ─────────────────────────────────────────────────────────

userSchema.methods.comparePassword =
  async function (candidatePassword) {
    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

userSchema.methods.incLoginAttempts =
  async function () {
    if (
      this.lockUntil &&
      this.lockUntil < Date.now()
    ) {
      return this.updateOne({
        $set: {
          loginAttempts: 1,
        },
        $unset: {
          lockUntil: 1,
        },
      });
    }

    const updates = {
      $inc: {
        loginAttempts: 1,
      },
    };

    if (
      this.loginAttempts + 1 >= 5 &&
      !this.isLocked
    ) {
      updates.$set = {
        lockUntil:
          Date.now() + 30 * 60 * 1000,
      };
    }

    return this.updateOne(updates);
  };

module.exports = mongoose.model(
  'User',
  userSchema
);
