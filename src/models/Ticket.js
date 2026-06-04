const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    message: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    attachments: [
      {
        name: String,
        url: String,
      },
    ],

    internal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },

    category: {
      type: String,
      enum: [
        'technical',
        'billing',
        'general',
        'project',
        'access',
      ],
      default: 'general',
    },

    priority: {
      type: String,
      enum: [
        'low',
        'medium',
        'high',
        'critical',
      ],
      default: 'medium',
    },

    status: {
      type: String,
      enum: [
        'open',
        'in_progress',
        'waiting_client',
        'resolved',
        'closed',
      ],
      default: 'open',
    },

    attachments: [
      {
        name: String,
        url: String,
        size: Number,
      },
    ],

    responses: [responseSchema],

    resolvedAt: Date,
    closedAt: Date,
    dueDate: Date,

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    ratingComment: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────

ticketSchema.index({
  raisedBy: 1,
  status: 1,
});

ticketSchema.index({
  assignedTo: 1,
});

ticketSchema.index({
  createdAt: -1,
});

// ─────────────────────────────────────────────────────────
// PRE SAVE
// ─────────────────────────────────────────────────────────

ticketSchema.pre('save', async function (next) {
  try {
    if (!this.ticketId) {
      const timestamp = Date.now();
      const random = Math.floor(
        1000 + Math.random() * 9000
      );

      this.ticketId = `TKT-${timestamp}-${random}`;
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model(
  'Ticket',
  ticketSchema
);
