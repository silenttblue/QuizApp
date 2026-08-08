const { validationResult } = require('express-validator');
const quizService = require('../services/quizService');

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

async function getQuestions(req, res, next) {
  try {
    const { amount, category, difficulty, quizId } = req.query;

    if (quizId) {
      const quiz = await quizService.getQuizById(quizId);
      const questions = quizService.toPlayableQuestions(quiz);
      return res.status(200).json({
        success: true,
        source: 'custom',
        quiz: {
          id: quiz._id,
          title: quiz.title,
          category: quiz.category,
          difficulty: quiz.difficulty,
        },
        questions,
      });
    }

    const questions = await quizService.fetchOpenTriviaQuestions({
      amount,
      category,
      difficulty,
    });

    res.status(200).json({
      success: true,
      source: 'opentdb',
      questions,
    });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function createQuiz(req, res, next) {
  try {
    if (handleValidation(req, res)) return;
    const quiz = await quizService.createCustomQuiz(req.user.id, req.body);
    res.status(201).json({ success: true, quiz });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function getAllQuizzes(req, res, next) {
  try {
    const quizzes = await quizService.getAllQuizzes();
    res.status(200).json({ success: true, quizzes });
  } catch (err) {
    next(err);
  }
}

async function getQuizById(req, res, next) {
  try {
    const quiz = await quizService.getQuizById(req.params.id);
    res.status(200).json({ success: true, quiz });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  }
}

async function saveResult(req, res, next) {
  try {
    if (!req.user) {
      return res.status(200).json({ success: true, message: 'Result not saved (guest)' });
    }
    const user = await quizService.saveSoloResult(req.user.id, req.body);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuestions,
  createQuiz,
  getAllQuizzes,
  getQuizById,
  saveResult,
};
