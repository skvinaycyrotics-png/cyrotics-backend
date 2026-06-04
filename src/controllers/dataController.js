const Project = require('../models/Project');
const Ticket = require('../models/Ticket');
const { ContactRequest, RegistrationRequest } = require('../models/index');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const emailService = require('../services/emailService');
const { auditLog } = require('../services/authService');

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────────────────

exports.getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, clientId, showOnWebsite } = req.query;
    const filter = {};

    // Clients can only see their own projects
    if (req.user.role === 'client') filter.client = req.user._id;
    else if (clientId) filter.client = clientId;

    if (status) filter.status = status;
    if (showOnWebsite !== undefined) filter.showOnWebsite = showOnWebsite === 'true';

    const total = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit))
      .populate('client', 'name email company');

    return paginatedResponse(res, projects, total, page, limit);
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email company')
      .populate('comments.author', 'name role');
    if (!project) return errorResponse(res, 404, 'Project not found.');
    // Clients can only see their own
    if (req.user.role === 'client' && project.client._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied.');
    }
    // Filter internal comments from clients
    if (req.user.role !== 'admin') {
      project.comments = project.comments.filter(c => !c.internal);
    }
    return successResponse(res, 200, 'Project.', { project });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.createProject = async (req, res) => {
  try {
    const project = await Project.create(req.body);
    await auditLog({ userId: req.user._id, action: 'PROJECT_CREATED', resource: 'Project', resourceId: project._id, req });
    return successResponse(res, 201, 'Project created.', { project });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('client', 'name email');
    if (!project) return errorResponse(res, 404, 'Project not found.');
    // Notify client
    if (req.body.status || req.body.progress !== undefined) {
      await emailService.projectUpdated(project, project.client.email, project.client.name,
        req.body.updateMessage || `Project status updated to ${project.status}, Progress: ${project.progress}%`);
    }
    await auditLog({ userId: req.user._id, action: 'PROJECT_UPDATED', resource: 'Project', resourceId: project._id, req });
    return successResponse(res, 200, 'Project updated.', { project });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.addComment = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return errorResponse(res, 404, 'Project not found.');
    const { text, internal } = req.body;
    project.comments.push({ author: req.user._id, text, internal: req.user.role === 'admin' ? internal : false });
    await project.save();
    return successResponse(res, 201, 'Comment added.');
  } catch (err) { return errorResponse(res, 500, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────────────────────────────────────────

exports.getTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const filter = {};
    if (req.user.role === 'client') filter.raisedBy = req.user._id;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit))
      .populate('raisedBy', 'name email company')
      .populate('assignedTo', 'name email');
    return paginatedResponse(res, tickets, total, page, limit);
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('raisedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('responses.author', 'name role');
    if (!ticket) return errorResponse(res, 404, 'Ticket not found.');
    if (req.user.role === 'client' && ticket.raisedBy._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied.');
    }
    return successResponse(res, 200, 'Ticket.', { ticket });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.createTicket = async (req, res) => {
  try {
    const ticket = await Ticket.create({ ...req.body, raisedBy: req.user._id });
    await emailService.ticketCreated(ticket, req.user);
    return successResponse(res, 201, 'Ticket created.', { ticket });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.addTicketResponse = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('raisedBy', 'name email');
    if (!ticket) return errorResponse(res, 404, 'Ticket not found.');
    const { message, internal, status } = req.body;
    ticket.responses.push({ author: req.user._id, message, internal: req.user.role === 'admin' ? !!internal : false });
    if (status) ticket.status = status;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    await ticket.save();
    if (!internal) await emailService.ticketUpdated(ticket, req.user.name, message);
    return successResponse(res, 201, 'Response added.', { ticket });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ticket) return errorResponse(res, 404, 'Ticket not found.');
    return successResponse(res, 200, 'Ticket updated.', { ticket });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

exports.submitContact = async (req, res) => {
  try {
    const contact = await ContactRequest.create({ ...req.body, ipAddress: req.ip });
    // Fire emails (don't await — non-blocking)
    emailService.contactFormAdmin(contact).catch(() => {});
    emailService.contactFormAck(contact).catch(() => {});
    return successResponse(res, 201, 'Inquiry submitted successfully.', { id: contact._id });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};
    const total = await ContactRequest.countDocuments(filter);
    const contacts = await ContactRequest.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    return paginatedResponse(res, contacts, total, page, limit);
  } catch (err) { return errorResponse(res, 500, err.message); }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await ContactRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return successResponse(res, 200, 'Contact updated.', { contact });
  } catch (err) { return errorResponse(res, 500, err.message); }
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

exports.submitRegistration = async (req, res) => {
  try {
    const existing = await RegistrationRequest.findOne({ email: req.body.email.toLowerCase(), status: 'pending' });
    if (existing) return errorResponse(res, 409, 'A pending request with this email already exists.');
    const regReq = await RegistrationRequest.create({ ...req.body, ipAddress: req.ip });
    emailService.registrationRequestAdmin(regReq).catch(() => {});
    emailService.registrationRequestAck(regReq).catch(() => {});
    return successResponse(res, 201, 'Access request submitted. You will be notified by email.');
  } catch (err) { return errorResponse(res, 500, err.message); }
};
