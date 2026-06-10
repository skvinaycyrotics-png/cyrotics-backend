const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { AuditLog } = require('../models/index');
const logger = require('../utils/logger');

// 🚀 FIXED: Tailored specifically for Cross-Domain Cookie transfers (Render -> Vercel)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,          // 🚀 CRITICAL: Must be true for cross-domain cookies to work over HTTPS
  sameSite: 'none',      // 🚀 CRITICAL: Allows cookies to traverse different domains securely
  path: '/',
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearTokenCookies = (res) => {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

const auditLog = async ({ userId, action, resource, resourceId, details, req, success = true }) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      success,
    });
  } catch (err) {
    logger.error(`AuditLog error: ${err.message}`);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  auditLog,
};
