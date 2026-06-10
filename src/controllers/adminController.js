const User = require('../models/User');
const Project = require('../models/Project');
const Ticket = require('../models/Ticket');

// 🚀 FIXED: Importing models directly from their individual files to break the circular dependency loop
const ContactRequest = require('../models/ContactRequest');
const RegistrationRequest = require('../models/RegistrationRequest');
const AuditLog = require('../models/AuditLog');

// If you need the other index models later, keep them isolated here
const { Testimonial, Job, Blog, SocialLink } = require('../models/index');

const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const emailService = require('../services/emailService');
const authService = require('../services/authService'); // 🚀 Changed to whole service object import
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalUsers, activeClients, pendingApprovals,
      totalProjects, activeProjects,
      openTickets, totalContacts, pendingRegistrations,
      recentContacts, recentTickets, recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'client', status: 'active' }),
      User.countDocuments({ status: 'pending' }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'in_progress' }),
      Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      ContactRequest.countDocuments(),
      RegistrationRequest.countDocuments({ status: 'pending' }),
      ContactRequest.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email subject status createdAt'),
      Ticket.find().sort({ createdAt: -1 }).limit(5).populate('raisedBy', 'name email').select('ticketId subject status priority createdAt'),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role status createdAt'),
    ]);

    // Monthly registrations (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyData = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return successResponse(res, 200, 'Dashboard data.', {
      kpis: { totalUsers, activeClients, pendingApprovals, totalProjects, activeProjects, openTickets, totalContacts, pendingRegistrations },
      recentContacts, recentTickets, recentUsers, monthlyData,
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── GET /api/admin/users ──────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('approvedBy', 'name email');

    return paginatedResponse(res, users, total, page, limit);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── PUT /api/admin/users/:id/approve ─────────────────────────────────────────
exports.approveUser = async (req, res) => {
  try {
    const { role, customMessage, dashboardConfig } = req.body;
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return errorResponse(res, 404, 'User not found.');
    if (user.status === 'active') return errorResponse(res, 400, 'User is already active.');

    // Generate temp password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    user.password = tempPassword; // pre-save hook will hash it
    user.status = 'active';
    user.role = role || user.role;
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    if (dashboardConfig) user.dashboardConfig = { ...user.dashboardConfig, ...dashboardConfig };
    await user.save();

    await emailService.registrationApproved(user, tempPassword);
    
    // Use fixed service reference call
    if (authService.auditLog) {
      await authService.auditLog({ userId: req.user._id, action: 'USER_APPROVED', resource: 'User', resourceId: user._id, req });
    }

    return successResponse(res, 200, 'User approved and credentials sent.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── PUT /api/admin/users/:id/reject ──────────────────────────────────────────
exports.rejectUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectionReason: reason,
    }, { new: true });
    if (!user) return errorResponse(res, 404, 'User not found.');
    await emailService.registrationRejected({ email: user.email, name: user.name, reason });
    
    if (authService.auditLog) {
      await authService.auditLog({ userId: req.user._id, action: 'USER_REJECTED', resource: 'User', resourceId: user._id, req });
    }
    return successResponse(res, 200, 'User rejected.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── PUT /api/admin/users/:id/suspend ─────────────────────────────────────────
exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!user) return errorResponse(res, 404, 'User not found.');
    
    if (authService.auditLog) {
      await authService.auditLog({ userId: req.user._id, action: 'USER_SUSPENDED', resource: 'User', resourceId: user._id, req });
    }
    return successResponse(res, 200, 'User suspended.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── PUT /api/admin/users/:id/dashboard-config ─────────────────────────────────
exports.updateDashboardConfig = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { dashboardConfig: req.body }, { new: true });
    if (!user) return errorResponse(res, 404, 'User not found.');
    return successResponse(res, 200, 'Dashboard config updated.', { user });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return errorResponse(res, 404, 'User not found.');
    
    if (authService.auditLog) {
      await authService.auditLog({ userId: req.user._id, action: 'USER_DELETED', resource: 'User', resourceId: req.params.id, req });
    }
    return successResponse(res, 200, 'User deleted.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── Registration Requests ─────────────────────────────────────────────────────
exports.getRegistrationRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};
    const total = await RegistrationRequest.countDocuments(filter);
    const requests = await RegistrationRequest.find(filter)
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    return paginatedResponse(res, requests, total, page, limit);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

exports.approveRegistration = async (req, res) => {
  try {
    const regReq = await RegistrationRequest.findById(req.params.id);
    if (!regReq) return errorResponse(res, 404, 'Request not found.');
    if (regReq.status !== 'pending') return errorResponse(res, 400, 'Already reviewed.');

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const newUser = await User.create({
      name: regReq.name, email: regReq.email, mobile: regReq.mobile,
      company: regReq.company, role: regReq.roleRequested,
      status: 'active', password: tempPassword,
      approvedBy: req.user._id, approvedAt: new Date(),
    });

    regReq.status = 'approved';
    regReq.reviewedBy = req.user._id;
    regReq.reviewedAt = new Date();
    regReq.createdUser = newUser._id;
    await regReq.save();

    await emailService.registrationApproved(newUser, tempPassword);
    
    if (authService.auditLog) {
      await authService.auditLog({ userId: req.user._id, action: 'REGISTRATION_APPROVED', resource: 'RegistrationRequest', resourceId: regReq._id, req });
    }
    return successResponse(res, 200, 'Registration approved and account created.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

exports.rejectRegistration = async (req, res) => {
  try {
    const { reason } = req.body;
    const regReq = await RegistrationRequest.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectionReason: reason,
      reviewedBy: req.user._id, reviewedAt: new Date(),
    }, { new: true });
    if (!regReq) return errorResponse(res, 404, 'Request not found.');
    await emailService.registrationRejected({ email: regReq.email, name: regReq.name, reason });
    return successResponse(res, 200, 'Registration rejected.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
      .populate('user', 'name email role');
    return paginatedResponse(res, logs, total, page, limit);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};
