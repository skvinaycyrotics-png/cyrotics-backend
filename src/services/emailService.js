const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ── Base HTML wrapper ─────────────────────────────────────────────────────────
const wrapHtml = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;}
  .wrapper{max-width:600px;margin:32px auto;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;overflow:hidden;border:1px solid #1e3a5f;}
  .header{background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px 40px;text-align:center;}
  .logo{font-size:26px;font-weight:700;color:#fff;letter-spacing:2px;}
  .tagline{color:rgba(255,255,255,.8);font-size:12px;margin-top:4px;letter-spacing:1px;}
  .body{padding:40px;}
  h1{font-size:22px;color:#f1f5f9;margin-bottom:8px;}
  p{color:#94a3b8;line-height:1.7;margin-bottom:12px;font-size:14px;}
  .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:20px;margin:20px 0;}
  .card .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);}
  .card .row:last-child{border-bottom:none;}
  .label{color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;}
  .value{color:#e2e8f0;font-size:14px;font-weight:500;}
  .btn{display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff!important;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0;}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
  .badge-success{background:#052e16;color:#4ade80;}
  .badge-warning{background:#422006;color:#fb923c;}
  .badge-danger{background:#450a0a;color:#f87171;}
  .badge-info{background:#082f49;color:#38bdf8;}
  .footer{background:rgba(0,0,0,.3);padding:24px 40px;text-align:center;}
  .footer p{color:#475569;font-size:12px;}
  .footer a{color:#0ea5e9;text-decoration:none;}
  .divider{border:none;border-top:1px solid rgba(255,255,255,.06);margin:24px 0;}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo">CYROTICS</div>
    <div class="tagline">ENTERPRISE TECHNOLOGY SOLUTIONS</div>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} Cyrotics Technologies (OPC) Pvt. Ltd.</p>
    <p style="margin-top:8px;">86/2, Street No.-54/V/3, New Delhi – 110044 | <a href="https://www.cyrotics.in">www.cyrotics.in</a></p>
    <p style="margin-top:8px;">This is an automated message. Do not reply directly to this email.</p>
  </div>
</div>
</body>
</html>`;

// ── Send helper ───────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, cc }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      cc,
      subject,
      html,
    });
    logger.info(`Email sent → ${to} | ${subject}`);
  } catch (err) {
    logger.error(`Email error → ${to} | ${err.message}`);
    // Don't throw — email failure should not break the API
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const emailService = {

  // ── Contact Form Submission ──────────────────────────────────────────────
  async contactFormAdmin(data) {
    const html = wrapHtml('New Contact Request', `
      <h1>📬 New Contact Request</h1>
      <p>A new inquiry has been submitted via the website contact form.</p>
      <div class="card">
        <div class="row"><span class="label">Name</span><span class="value">${data.salutation || ''} ${data.firstName} ${data.lastName || ''}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${data.email}</span></div>
        <div class="row"><span class="label">Phone</span><span class="value">${data.countryCode || ''} ${data.phone || 'N/A'}</span></div>
        <div class="row"><span class="label">Company</span><span class="value">${data.company || 'N/A'}</span></div>
        <div class="row"><span class="label">Subject</span><span class="value">${data.subject}</span></div>
        <div class="row"><span class="label">Priority</span><span class="value">${data.priority || 'Normal'}</span></div>
        <div class="row"><span class="label">NDA Required</span><span class="value">${data.nda ? 'Yes' : 'No'}</span></div>
      </div>
      <div class="card" style="margin-top:12px;">
        <p style="color:#94a3b8;font-size:13px;font-weight:600;margin-bottom:8px;">MESSAGE</p>
        <p style="color:#e2e8f0;">${data.message}</p>
      </div>
      <a href="${process.env.FRONTEND_URL}/admin/contacts" class="btn">View in Admin Panel →</a>
    `);
    await sendMail({ to: process.env.ADMIN_EMAIL, subject: `[Contact] ${data.subject} — ${data.firstName} ${data.lastName || ''}`, html });
  },

  async contactFormAck(data) {
    const html = wrapHtml('We received your inquiry', `
      <h1>Thank you, ${data.firstName}!</h1>
      <p>We have received your inquiry and our team will get back to you within <strong style="color:#38bdf8;">1–2 business days</strong>.</p>
      <div class="card">
        <div class="row"><span class="label">Subject</span><span class="value">${data.subject}</span></div>
        <div class="row"><span class="label">Status</span><span class="value"><span class="badge badge-info">Under Review</span></span></div>
      </div>
      <hr class="divider"/>
      <p>For urgent matters, contact us directly:</p>
      <p>📞 <strong style="color:#e2e8f0;">+91 99992 95636</strong> &nbsp;|&nbsp; 📧 <strong style="color:#e2e8f0;">info@cyrotics.in</strong></p>
    `);
    await sendMail({ to: data.email, subject: 'We received your inquiry — Cyrotics Technologies', html });
  },

  // ── Registration Request ─────────────────────────────────────────────────
  async registrationRequestAdmin(data) {
    const html = wrapHtml('New Access Request', `
      <h1>🔐 New Access Request</h1>
      <p>A new portal access request has been submitted and requires your review.</p>
      <div class="card">
        <div class="row"><span class="label">Name</span><span class="value">${data.name}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${data.email}</span></div>
        <div class="row"><span class="label">Company</span><span class="value">${data.company || 'N/A'}</span></div>
        <div class="row"><span class="label">Role Requested</span><span class="value"><span class="badge badge-warning">${data.roleRequested.toUpperCase()}</span></span></div>
        <div class="row"><span class="label">Purpose</span><span class="value">${data.purpose}</span></div>
      </div>
      <a href="${process.env.FRONTEND_URL}/admin/registrations" class="btn">Review Request →</a>
    `);
    await sendMail({ to: process.env.ADMIN_EMAIL, subject: `[Access Request] ${data.name} — ${data.roleRequested} access`, html });
  },

  async registrationRequestAck(data) {
    const html = wrapHtml('Access Request Received', `
      <h1>Request Received, ${data.name}!</h1>
      <p>Your access request for the <strong style="color:#38bdf8;">Cyrotics Client Portal</strong> has been received.</p>
      <div class="card">
        <div class="row"><span class="label">Access Type</span><span class="value">${data.roleRequested}</span></div>
        <div class="row"><span class="label">Status</span><span class="value"><span class="badge badge-warning">Pending Review</span></span></div>
      </div>
      <p>Our team will review your request and notify you via email. This typically takes <strong style="color:#38bdf8;">1–2 business days</strong>.</p>
    `);
    await sendMail({ to: data.email, subject: 'Access request received — Cyrotics Portal', html });
  },

  async registrationApproved(user, tempPassword) {
    const html = wrapHtml('Portal Access Approved', `
      <h1>🎉 Access Approved, ${user.name}!</h1>
      <p>Your request for <strong style="color:#4ade80;">Cyrotics Client Portal</strong> access has been approved.</p>
      <div class="card">
        <div class="row"><span class="label">Portal URL</span><span class="value">${process.env.FRONTEND_URL}/portal</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${user.email}</span></div>
        <div class="row"><span class="label">Temporary Password</span><span class="value" style="font-family:monospace;color:#4ade80;">${tempPassword}</span></div>
        <div class="row"><span class="label">Role</span><span class="value"><span class="badge badge-success">${user.role.toUpperCase()}</span></span></div>
      </div>
      <p style="color:#fb923c;font-size:13px;">⚠️ Please change your password immediately after first login.</p>
      <a href="${process.env.FRONTEND_URL}/portal/login" class="btn">Login to Portal →</a>
    `);
    await sendMail({ to: user.email, subject: '✅ Portal access approved — Cyrotics Technologies', html });
  },

  async registrationRejected(data) {
    const html = wrapHtml('Access Request Update', `
      <h1>Access Request Update</h1>
      <p>We have reviewed your access request for the Cyrotics Portal.</p>
      <div class="card">
        <div class="row"><span class="label">Status</span><span class="value"><span class="badge badge-danger">Not Approved</span></span></div>
        ${data.reason ? `<div class="row"><span class="label">Reason</span><span class="value">${data.reason}</span></div>` : ''}
      </div>
      <p>For further assistance, please contact us at <a href="mailto:info@cyrotics.in" style="color:#0ea5e9;">info@cyrotics.in</a>.</p>
    `);
    await sendMail({ to: data.email, subject: 'Access request update — Cyrotics Portal', html });
  },

  // ── Ticket Notifications ─────────────────────────────────────────────────
  async ticketCreated(ticket, user) {
    const adminHtml = wrapHtml('New Support Ticket', `
      <h1>🎫 New Ticket: ${ticket.ticketId}</h1>
      <div class="card">
        <div class="row"><span class="label">Ticket ID</span><span class="value">${ticket.ticketId}</span></div>
        <div class="row"><span class="label">Subject</span><span class="value">${ticket.subject}</span></div>
        <div class="row"><span class="label">Raised By</span><span class="value">${user.name} (${user.email})</span></div>
        <div class="row"><span class="label">Priority</span><span class="value">${ticket.priority}</span></div>
        <div class="row"><span class="label">Category</span><span class="value">${ticket.category}</span></div>
      </div>
      <a href="${process.env.FRONTEND_URL}/admin/tickets/${ticket._id}" class="btn">View Ticket →</a>
    `);
    await sendMail({ to: process.env.ADMIN_EMAIL, subject: `[${ticket.ticketId}] ${ticket.subject}`, html: adminHtml });

    const userHtml = wrapHtml('Ticket Created', `
      <h1>Ticket Created Successfully</h1>
      <p>Your support ticket has been created and our team will respond shortly.</p>
      <div class="card">
        <div class="row"><span class="label">Ticket ID</span><span class="value" style="color:#38bdf8;font-family:monospace;">${ticket.ticketId}</span></div>
        <div class="row"><span class="label">Subject</span><span class="value">${ticket.subject}</span></div>
        <div class="row"><span class="label">Priority</span><span class="value">${ticket.priority}</span></div>
        <div class="row"><span class="label">Status</span><span class="value"><span class="badge badge-info">Open</span></span></div>
      </div>
      <a href="${process.env.FRONTEND_URL}/portal/tickets/${ticket._id}" class="btn">Track Ticket →</a>
    `);
    await sendMail({ to: user.email, subject: `[${ticket.ticketId}] Ticket created — ${ticket.subject}`, html: userHtml });
  },

  async ticketUpdated(ticket, updaterName, message) {
    const html = wrapHtml('Ticket Update', `
      <h1>Ticket Update: ${ticket.ticketId}</h1>
      <p><strong style="color:#e2e8f0;">${updaterName}</strong> has added a response to your ticket.</p>
      <div class="card">
        <div class="row"><span class="label">Ticket ID</span><span class="value">${ticket.ticketId}</span></div>
        <div class="row"><span class="label">Subject</span><span class="value">${ticket.subject}</span></div>
        <div class="row"><span class="label">Status</span><span class="value">${ticket.status}</span></div>
        <div class="row"><span class="label">Response</span><span class="value">${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</span></div>
      </div>
      <a href="${process.env.FRONTEND_URL}/portal/tickets/${ticket._id}" class="btn">View & Reply →</a>
    `);
    const raisedBy = ticket.raisedBy;
    if (raisedBy && raisedBy.email) {
      await sendMail({ to: raisedBy.email, subject: `[${ticket.ticketId}] Update on your ticket`, html });
    }
  },

  // ── Project Update ───────────────────────────────────────────────────────
  async projectUpdated(project, clientEmail, clientName, updateMsg) {
    const html = wrapHtml('Project Update', `
      <h1>Project Update</h1>
      <p>Hi ${clientName}, there's an update on your project.</p>
      <div class="card">
        <div class="row"><span class="label">Project</span><span class="value">${project.name}</span></div>
        <div class="row"><span class="label">Project ID</span><span class="value">${project.projectId}</span></div>
        <div class="row"><span class="label">Status</span><span class="value">${project.status}</span></div>
        <div class="row"><span class="label">Progress</span><span class="value">${project.progress}%</span></div>
        <div class="row"><span class="label">Update</span><span class="value">${updateMsg}</span></div>
      </div>
      <a href="${process.env.FRONTEND_URL}/portal/projects/${project._id}" class="btn">View Project →</a>
    `);
    await sendMail({ to: clientEmail, subject: `Project Update: ${project.name} — Cyrotics`, html });
  },
};

module.exports = emailService;
