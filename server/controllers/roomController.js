const { validationResult } = require('express-validator');
const crypto = require('crypto');
const roomService = require('../services/roomService');

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

function newPlayerId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

async function createRoom(req, res, next) {
  try {
    if (handleValidation(req, res)) return;

    const hostId = newPlayerId();
    const room = roomService.createRoom({
      hostName: req.body.name.trim(),
      hostId,
      quizId: req.body.quizId || null,
      category: req.body.category || '9',
      difficulty: req.body.difficulty || 'medium',
      amount: Number(req.body.amount) || 10,
    });

    res.status(201).json({
      success: true,
      playerId: hostId,
      room: roomService.publicRoom(room),
    });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function joinRoom(req, res, next) {
  try {
    if (handleValidation(req, res)) return;

    const playerId = newPlayerId();
    const { room } = roomService.joinRoom(req.body.code, {
      playerId,
      playerName: req.body.name.trim(),
    });

    res.status(200).json({
      success: true,
      playerId,
      room: roomService.publicRoom(room),
    });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function getRoom(req, res, next) {
  try {
    const room = roomService.getRoom(req.params.code);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.status(200).json({ success: true, room: roomService.publicRoom(room) });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRoom, joinRoom, getRoom };
