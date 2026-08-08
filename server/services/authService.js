const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = {
  signup,
  login,
  getProfile,
  recordQuizResult,
  sanitizeUser,
};
