const mongoose = require('mongoose');
const slugify = require('slugify');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  completedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
  },
});

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  size: Number,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  visibleToClient: {
    type: Boolean,
    default: true,
  },
});

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    internal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
    },

    description: {
      type: String,
      maxlength: 5000,
    },

    shortDescription: {
      type: String,
      maxlength: 300,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assignedTeam: [
      {
        type: String,
        trim: true,
      },
    ],

    status: {
      type: String,
      enum: [
        'planning',
        'in_progress',
        'on_hold',
        'completed',
        'cancelled',
      ],
      default: 'planning',
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

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    startDate: Date,
    endDate: Date,
    completedAt: Date,

    milestones: [milestoneSchema],
    documents: [documentSchema],
    comments: [commentSchema],

    showOnWebsite: {
      type: Boolean,
      default: false,
    },

    tags: [String],

    imageUrl: String,
    imageHint: String,

    budget: Number,

    category: String,
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────

projectSchema.index({
  client: 1,
  status: 1,
});

projectSchema.index({
  showOnWebsite: 1,
});

projectSchema.index({
  createdAt: -1,
});

// ─────────────────────────────────────────────────────────
// PRE SAVE
// ─────────────────────────────────────────────────────────

projectSchema.pre('save', async function (next) {
  try {
    if (!this.projectId) {
      const timestamp = Date.now();
      this.projectId = `CYR-${timestamp}`;
    }

    if (!this.slug && this.name) {
      this.slug = slugify(this.name, {
        lower: true,
        strict: true,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model(
  'Project',
  projectSchema
);
