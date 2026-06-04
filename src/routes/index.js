const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protect, adminOnly, clientOrAdmin } = require('../middleware/auth');

const authCtrl = require('../controllers/authController');
const adminCtrl = require('../controllers/adminController');
const cmsCtrl = require('../controllers/cmsController');
const dataCtrl = require('../controllers/dataController');

const router = express.Router();

// ── Validation helper ─────────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Validation failed.', errors: errors.array() });
  }
  next();
};

// ═════════════════════════════════════════════════════════════════════════════
// AUTH  /api/auth
// ═════════════════════════════════════════════════════════════════════════════
const authRouter = express.Router();

authRouter.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], authCtrl.login);

authRouter.post('/refresh', authCtrl.refresh);
authRouter.post('/logout', protect, authCtrl.logout);
authRouter.get('/me', protect, authCtrl.getMe);
authRouter.put('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
], authCtrl.changePassword);
authRouter.post('/2fa/setup', protect, authCtrl.setup2FA);
authRouter.post('/2fa/verify', protect, [body('code').notEmpty(), validate], authCtrl.verify2FA);

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN  /api/admin
// ═════════════════════════════════════════════════════════════════════════════
const adminRouter = express.Router();
adminRouter.use(protect, adminOnly);

adminRouter.get('/dashboard', adminCtrl.getDashboard);
adminRouter.get('/users', adminCtrl.getUsers);
adminRouter.put('/users/:id/approve', adminCtrl.approveUser);
adminRouter.put('/users/:id/reject', adminCtrl.rejectUser);
adminRouter.put('/users/:id/suspend', adminCtrl.suspendUser);
adminRouter.put('/users/:id/dashboard-config', adminCtrl.updateDashboardConfig);
adminRouter.delete('/users/:id', adminCtrl.deleteUser);
adminRouter.get('/registrations', adminCtrl.getRegistrationRequests);
adminRouter.put('/registrations/:id/approve', adminCtrl.approveRegistration);
adminRouter.put('/registrations/:id/reject', adminCtrl.rejectRegistration);
adminRouter.get('/audit-logs', adminCtrl.getAuditLogs);

// Admin project routes
adminRouter.get('/contacts', dataCtrl.getContacts);
adminRouter.put('/contacts/:id', dataCtrl.updateContact);

// ═════════════════════════════════════════════════════════════════════════════
// PROJECTS  /api/projects
// ═════════════════════════════════════════════════════════════════════════════
const projectRouter = express.Router();
projectRouter.use(protect);

projectRouter.get('/', dataCtrl.getProjects);
projectRouter.get('/:id', dataCtrl.getProject);
projectRouter.post('/', adminOnly, dataCtrl.createProject);
projectRouter.put('/:id', adminOnly, dataCtrl.updateProject);
projectRouter.post('/:id/comments', clientOrAdmin, dataCtrl.addComment);

// ═════════════════════════════════════════════════════════════════════════════
// TICKETS  /api/tickets
// ═════════════════════════════════════════════════════════════════════════════
const ticketRouter = express.Router();
ticketRouter.use(protect);

ticketRouter.get('/', dataCtrl.getTickets);
ticketRouter.get('/:id', dataCtrl.getTicket);
ticketRouter.post('/', clientOrAdmin, [
  body('subject').notEmpty().trim(),
  body('description').notEmpty().trim(),
  validate,
], dataCtrl.createTicket);
ticketRouter.post('/:id/responses', clientOrAdmin, dataCtrl.addTicketResponse);
ticketRouter.put('/:id', adminOnly, dataCtrl.updateTicket);

// ═════════════════════════════════════════════════════════════════════════════
// CMS — PUBLIC GET routes + Admin write routes
// ═════════════════════════════════════════════════════════════════════════════
const cmsRouter = express.Router();

// Public read endpoints
cmsRouter.get('/testimonials', cmsCtrl.getTestimonials);
cmsRouter.get('/jobs', cmsCtrl.getJobs);
cmsRouter.get('/jobs/:slug', cmsCtrl.getJob);
cmsRouter.get('/blogs', cmsCtrl.getBlogs);
cmsRouter.get('/blogs/:slug', cmsCtrl.getBlog);
cmsRouter.get('/social-links', cmsCtrl.getSocialLinks);

// Admin-only write
cmsRouter.post('/testimonials', protect, adminOnly, cmsCtrl.createTestimonial);
cmsRouter.put('/testimonials/:id', protect, adminOnly, cmsCtrl.updateTestimonial);
cmsRouter.delete('/testimonials/:id', protect, adminOnly, cmsCtrl.deleteTestimonial);
cmsRouter.post('/jobs', protect, adminOnly, cmsCtrl.createJob);
cmsRouter.put('/jobs/:id', protect, adminOnly, cmsCtrl.updateJob);
cmsRouter.delete('/jobs/:id', protect, adminOnly, cmsCtrl.deleteJob);
cmsRouter.post('/blogs', protect, adminOnly, cmsCtrl.createBlog);
cmsRouter.put('/blogs/:id', protect, adminOnly, cmsCtrl.updateBlog);
cmsRouter.delete('/blogs/:id', protect, adminOnly, cmsCtrl.deleteBlog);
cmsRouter.put('/social-links', protect, adminOnly, cmsCtrl.upsertSocialLinks);

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC  /api/contact + /api/register
// ═════════════════════════════════════════════════════════════════════════════
const publicRouter = express.Router();

publicRouter.post('/contact', [
  body('firstName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('subject').notEmpty().trim(),
  body('message').notEmpty().trim().isLength({ min: 10 }),
  validate,
], dataCtrl.submitContact);

publicRouter.post('/register', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('purpose').notEmpty().trim().isLength({ min: 20 }),
  body('roleRequested').isIn(['client', 'guest']),
  validate,
], dataCtrl.submitRegistration);

// ── Mount all routers ─────────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/projects', projectRouter);
router.use('/tickets', ticketRouter);
router.use('/cms', cmsRouter);
router.use('/', publicRouter);

module.exports = router;
