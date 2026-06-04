const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

// ── protect: verify JWT from cookie or Authorization header ──────────────────
const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Authentication required. Please log in.');
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select('-password -refreshTokens -twoFactorSecret');
    if (!user) return errorResponse(res, 401, 'User no longer exists.');
    if (user.status !== 'active') {
      return errorResponse(res, 403, `Account is ${user.status}. Contact support.`);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Session expired. Please log in again.');
    }
    return errorResponse(res, 401, 'Invalid token. Please log in again.');
  }
};

// ── authorize: restrict to specific roles ────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, `Access denied. Required role: ${roles.join(' or ')}.`);
    }
    next();
  };
};

// ── adminOnly shorthand ───────────────────────────────────────────────────────
const adminOnly = authorize('admin');

// ── clientOrAdmin ─────────────────────────────────────────────────────────────
const clientOrAdmin = authorize('admin', 'client');

module.exports = { protect, authorize, adminOnly, clientOrAdmin };
