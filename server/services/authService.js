const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('./emailService');

const GENERIC_FORGOT_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    highestScore: user.highestScore,
    quizHistory: user.quizHistory || [],
    createdAt: user.createdAt,
  };
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getResetExpiryMinutes() {
  const n = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function getClientBaseUrl() {
  return (process.env.CLIENT_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
}

async function signup({ name, email, password }) {
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    const error = new Error('Email already registered');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);

  return { user: sanitizeUser(user), token };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const match = await user.comparePassword(password);
  if (!match) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = signToken(user._id);
  return { user: sanitizeUser(user), token };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return sanitizeUser(user);
}

async function recordQuizResult(userId, result) {
  const user = await User.findById(userId);
  if (!user) return null;

  user.quizHistory.unshift(result);
  if (user.quizHistory.length > 50) {
    user.quizHistory = user.quizHistory.slice(0, 50);
  }
  if (result.score > user.highestScore) {
    user.highestScore = result.score;
  }
  await user.save();
  return sanitizeUser(user);
}

/**
 * Request a password reset. Always returns the same message so callers
 * cannot probe whether an email is registered.
 */
async function forgotPassword(email) {
  const normalized = String(email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalized }).select(
    '+resetPasswordToken +resetPasswordExpires'
  );

  if (!user) {
    return { message: GENERIC_FORGOT_MESSAGE };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresMinutes = getResetExpiryMinutes();

  user.resetPasswordToken = hashResetToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + expiresMinutes * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${getClientBaseUrl()}/pages/reset-password.html?token=${rawToken}`;

  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresMinutes,
    });
  } catch (err) {
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save({ validateBeforeSave: false });
    throw err;
  }

  return { message: GENERIC_FORGOT_MESSAGE };
}

/**
 * Set a new password using a valid one-time reset token.
 * Relies on User pre-save hook to bcrypt-hash the new password.
 */
async function resetPassword(rawToken, newPassword) {
  if (!rawToken || !newPassword) {
    const error = new Error('Token and new password are required');
    error.statusCode = 400;
    throw error;
  }

  const hashed = hashResetToken(rawToken);
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires +password');

  if (!user) {
    const error = new Error('Reset link is invalid or has expired. Please request a new one.');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  return { message: 'Password updated successfully. You can log in with your new password.' };
}

module.exports = {
  signup,
  login,
  getProfile,
  recordQuizResult,
  forgotPassword,
  resetPassword,
  sanitizeUser,
};
