// ─────────────────────────────────────────────────────────────────────────────
// BLOG POST
// ─────────────────────────────────────────────────────────────────────────────
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    excerpt: { type: String, maxlength: 400 },
    content: { type: String, required: true },
    coverImage: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [String],
    category: { type: String, trim: true },
    published: { type: Boolean, default: false },
    publishedAt: Date,

    // SEO
    metaTitle: String,
    metaDescription: { type: String, maxlength: 160 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

blogSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    const slugify = require('slugify');
    this.slug =
      slugify(this.title, { lower: true, strict: true }) +
      '-' +
      Date.now();
  }

  if (
    this.isModified('published') &&
    this.published &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

// KEEP THIS
blogSchema.index({
  published: 1,
  publishedAt: -1,
});

// REMOVE THIS
// blogSchema.index({ slug: 1 });
