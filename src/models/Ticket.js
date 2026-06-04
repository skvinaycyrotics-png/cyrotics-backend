const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const responseSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 5000 },
    attachments: [{ name: String, url: String }],
    internal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },

    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    category: {
      type: String,
      enum: ['technical', 'billing', 'general', 'project', 'access'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_client', 'resolved', 'closed'],
      default: 'open',
    },

    attachments: [{ name: String, url: String, size: Number }],
    responses: [responseSchema],

    resolvedAt: Date,
    closedAt: Date,
    dueDate: Date,

    // Client satisfaction rating after resolution
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
ticketSchema.index({ raisedBy: 1, status: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ ticketId: 1 });

// ── Pre-save: generate ticketId ────────────────────────────────────────────
ticketSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketId = `TKT-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
