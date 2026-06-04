const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIAL
// ─────────────────────────────────────────────────────────────────────────────
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    designation: { type: String, trim: true },
    message: { type: String, required: true, maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    avatar: String,
    published: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
testimonialSchema.index({ published: 1, order: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// JOB
// ─────────────────────────────────────────────────────────────────────────────
const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    department: { type: String, trim: true },
    location: { type: String, trim: true },
    type: { type: String, enum: ['full_time', 'part_time', 'contract', 'internship'], default: 'full_time' },
    experience: { type: String, trim: true },
    salary: { type: String, trim: true },
    description: { type: String, required: true },
    requirements: [String],
    responsibilities: [String],
    published: { type: Boolean, default: false },
    closingDate: Date,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
jobSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    const slugify = require('slugify');
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});
jobSchema.index({ published: 1, createdAt: -1 });

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
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  if (this.isModified('published') && this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});
blogSchema.index({ slug: 1 });
blogSchema.index({ published: 1, publishedAt: -1 });

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT REQUEST
// ─────────────────────────────────────────────────────────────────────────────
const contactRequestSchema = new mongoose.Schema(
  {
    salutation: String,
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: String,
    countryCode: String,
    company: String,
    designation: String,
    country: String,
    city: String,
    address: String,
    pincode: String,
    subject: { type: String, required: true },
    department: String,
    message: { type: String, required: true },
    projectType: [String],
    projectLocation: String,
    projectBudget: String,
    priority: { type: String, default: 'Normal' },
    contactMethod: String,
    contactTime: String,
    howDidYouHear: String,
    nda: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: false },
    // Admin workflow
    status: {
      type: String,
      enum: ['new', 'read', 'in_progress', 'resolved', 'spam'],
      default: 'new',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminNotes: String,
    ipAddress: String,
  },
  { timestamps: true }
);
contactRequestSchema.index({ status: 1, createdAt: -1 });
contactRequestSchema.index({ email: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION REQUEST
// ─────────────────────────────────────────────────────────────────────────────
const registrationRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: String,
    company: String,
    designation: String,
    purpose: { type: String, required: true, maxlength: 1000 },
    roleRequested: { type: String, enum: ['client', 'guest'], required: true },
    projectReference: String,
    // Admin workflow
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String,
    // Link to created user account after approval
    createdUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: String,
  },
  { timestamps: true }
);
registrationRequestSchema.index({ status: 1, createdAt: -1 });

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL LINK
// ─────────────────────────────────────────────────────────────────────────────
const socialLinkSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    icon: String,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: String,
    resourceId: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    success: { type: Boolean, default: true },
  },
  { timestamps: true }
);
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = {
  Testimonial: mongoose.model('Testimonial', testimonialSchema),
  Job: mongoose.model('Job', jobSchema),
  Blog: mongoose.model('Blog', blogSchema),
  ContactRequest: mongoose.model('ContactRequest', contactRequestSchema),
  RegistrationRequest: mongoose.model('RegistrationRequest', registrationRequestSchema),
  SocialLink: mongoose.model('SocialLink', socialLinkSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
};
