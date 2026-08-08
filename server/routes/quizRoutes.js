const express = require('express');
const { body } = require('express-validator');
const quizController = require('../controllers/quizController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/questions', quizController.getQuestions);
router.get('/all', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);

router.post(
  '/create',
  protect,
  [
    body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
    body('questions').isArray({ min: 1 }).withMessage('Add at least one question'),
    body('questions.*.question').trim().notEmpty().withMessage('Question text is required'),
    body('questions.*.options').isArray({ min: 4, max: 4 }).withMessage('Each question needs 4 options'),
    body('questions.*.correctIndex').isInt({ min: 0, max: 3 }).withMessage('Mark a correct option (0–3)'),
  ],
  quizController.createQuiz
);

router.post('/result', optionalAuth, quizController.saveResult);

module.exports = router;
