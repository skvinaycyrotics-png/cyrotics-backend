// 🚀 FIXED: Importing models directly from their individual schema files 
// to prevent any circular dependency crashes with the central index file.
const Testimonial = require('../models/Testimonial');
const Job = require('../models/Job');
const Blog = require('../models/Blog');
const SocialLink = require('../models/SocialLink');

const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIALS
// ─────────────────────────────────────────────────────────────────────────────
exports.getTestimonials = async (req, res) => {
  try {
    const { published } = req.query;
    const filter = {};
    if (published !== undefined) filter.published = published === 'true';
    const items = await Testimonial.find(filter).sort({ order: 1, createdAt: -1 });
    return successResponse(res, 200, 'Testimonials.', { testimonials: items });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.createTestimonial = async (req, res) => {
  try {
    const item = await Testimonial.create(req.body);
    return successResponse(res, 201, 'Testimonial created.', { testimonial: item });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.updateTestimonial = async (req, res) => {
  try {
    const item = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return errorResponse(res, 404, 'Not found.');
    return successResponse(res, 200, 'Updated.', { testimonial: item });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.deleteTestimonial = async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    return successResponse(res, 200, 'Deleted.');
  } catch (err) { return errorResponse(res, 500, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────────────────────────────────────
exports.getJobs = async (req, res) => {
  try {
    const { published, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (published !== undefined) filter.published = published === 'true';
    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    return paginatedResponse(res, jobs, total, page, limit);
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.getJob = async (req, res) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug });
    if (!job) return errorResponse(res, 404, 'Job not found.');
    return successResponse(res, 200, 'Job.', { job });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.createJob = async (req, res) => {
  try {
    const job = await Job.create({ ...req.body, postedBy: req.user._id });
    return successResponse(res, 201, 'Job created.', { job });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!job) return errorResponse(res, 404, 'Not found.');
    return successResponse(res, 200, 'Updated.', { job });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    return successResponse(res, 200, 'Deleted.');
  } catch (err) { return errorResponse(res, 500, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOGS
// ─────────────────────────────────────────────────────────────────────────────
exports.getBlogs = async (req, res) => {
  try {
    const { published, page = 1, limit = 12, tag, category } = req.query;
    const filter = {};
    if (published !== undefined) filter.published = published === 'true';
    if (tag) filter.tags = tag;
    if (category) filter.category = category;
    const total = await Blog.countDocuments(filter);
    const blogs = await Blog.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page-1)*limit).limit(Number(limit))
      .populate('author', 'name');
    return paginatedResponse(res, blogs, total, page, limit);
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.getBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).populate('author', 'name');
    if (!blog) return errorResponse(res, 404, 'Blog not found.');
    // Increment views (fire and forget)
    Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).exec();
    return successResponse(res, 200, 'Blog.', { blog });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL LINKS
// ─────────────────────────────────────────────────────────────────────────────
exports.getSocialLinks = async (req, res) => {
  try {
    const links = await SocialLink.find({ active: true }).sort({ order: 1 });
    return successResponse(res, 200, 'Social links.', { links });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.upsertSocialLinks = async (req, res) => {
  try {
    const { links } = req.body; // array of { platform, url, icon, order }
    await SocialLink.deleteMany({});
    const created = await SocialLink.insertMany(links);
    return successResponse(res, 200, 'Social links updated.', { links: created });
  } catch (err) { return errorResponse(res, 500, err.message); }
};
