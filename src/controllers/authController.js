const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, setTokenCookies, clearTokenCookies, auditLog } = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/response');
const emailService = require('../services/emailService');

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password, twoFactorCode } = req.body;

  try {
    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required fields.');
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +refreshTokens +twoFactorSecret');

    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    // Check account lock
    if (user.isLocked) {
      return errorResponse(res, 423, 'Account temporarily locked due to too many failed attempts. Try again in 30 minutes.');
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      await user.incLoginAttempts();
      await auditLog({ userId: user._id, action: 'LOGIN_FAILED', req, success: false });
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    if (user.status !== 'active') {
      return errorResponse(res, 403, `Account is ${user.status}. Contact support at info@cyrotics.in`);
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ success: true, requiresTwoFactor: true, message: '2FA code required.' });
      }
      const valid = authenticator.verify({ token: twoFactorCode, secret: user.twoFactorSecret });
      if (!valid) {
        return errorResponse(res, 401, 'Invalid 2FA code.');
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Store hashed refresh token (keep last 5)
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), hashedRefresh];
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    // 🚀 ENFORCED: Sets cross-domain secure authorization cookies
    setTokenCookies(res, accessToken, refreshToken);
    await auditLog({ userId: user._id, action: 'LOGIN_SUCCESS', req });

    const { password: _, refreshTokens: __, twoFactorSecret: ___, ...userData } = user.toObject();
    return successResponse(res, 200, 'Login successful.', { user: userData });

  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return errorResponse(res, 401, 'No refresh token provided.');

  try {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ refreshTokens: hashed }).select('+refreshTokens');
    if (!user) return errorResponse(res, 401, 'Invalid or expired session. Please log in again.');
    if (user.status !== 'active') return errorResponse(res, 403, 'Account inactive.');

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newHashed = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    // Rotate refresh tokens
    user.refreshTokens = user.refreshTokens.filter(t => t !== hashed);
    user.refreshTokens.push(newHashed);
    await user.save();

    // 🚀 ENFORCED: Overwrite stale authorization structures safely across domains
    setTokenCookies(res, newAccessToken, newRefreshToken);
    return successResponse(res, 200, 'Token refreshed successfully.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token && req.user) {
      const hashed = crypto.createHash('sha256').update(token).digest('hex');
      await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: hashed } });
      await auditLog({ userId: req.user._id, action: 'LOGOUT', req });
    }
    
    // 🚀 ENFORCED: Wipe clear client layout cookie tracking elements securely
    clearTokenCookies(res);
    return successResponse(res, 200, 'Logged out successfully.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return errorResponse(res, 401, 'Not authenticated.');
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 404, 'User account profile not found.');
    }
    
    return successResponse(res, 200, 'User profile retrieved successfully.', { user });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id).select('+password');
    const match = await user.comparePassword(currentPassword);
    if (!match) return errorResponse(res, 400, 'Current password is incorrect.');
    
    user.password = newPassword;
    await user.save();
    await auditLog({ userId: user._id, action: 'PASSWORD_CHANGED', req });
    return successResponse(res, 200, 'Password changed successfully.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── POST /api/auth/2fa/setup ──────────────────────────────────────────────────
exports.setup2FA = async (req, res) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'Cyrotics Portal', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret });
    return successResponse(res, 200, '2FA setup initiated.', { qrCode, secret });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ── POST /api/auth/2fa/verify ─────────────────────────────────────────────────
exports.verify2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return errorResponse(res, 400, 'Verification code is required.');

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) return errorResponse(res, 400, 'Invalid 2FA code.');
    
    await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true });
    await auditLog({ userId: user._id, action: '2FA_ENABLED', req });
    return successResponse(res, 200, '2FA enabled successfully.');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};
