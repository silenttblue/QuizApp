const express = require('express');
const { body } = require('express-validator');
const roomController = require('../controllers/roomController');

const router = express.Router();

router.post(
  '/create',
  [
    body('name').trim().isLength({ min: 2, max: 30 }).withMessage('Name must be 2–30 characters'),
    body('category').optional(),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'any']),
    body('amount').optional().isInt({ min: 5, max: 20 }),
  ],
  roomController.createRoom
);

router.post(
  '/join',
  [
    body('name').trim().isLength({ min: 2, max: 30 }).withMessage('Name must be 2–30 characters'),
    body('code').trim().isLength({ min: 4, max: 8 }).withMessage('Valid room code is required'),
  ],
  roomController.joinRoom
);

router.get('/:code', roomController.getRoom);

module.exports = router;
