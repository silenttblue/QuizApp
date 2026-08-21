const { validationResult } = require('express-validator');
const authService = require('../services/authService');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  return null;
}

async function signup(req, res, next) {
  try {
    if (handleValidation(req, res)) return;
    const result = await authService.signup(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function login(req, res, next) {
  try {
    if (handleValidation(req, res)) return;
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function profile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    if (handleValidation(req, res)) return;
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    if (handleValidation(req, res)) return;
    const result = await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

module.exports = { signup, login, profile, forgotPassword, resetPassword };
