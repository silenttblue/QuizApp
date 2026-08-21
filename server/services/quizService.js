const Quiz = require('../models/Quiz');
const { recordQuizResult } = require('./authService');

const OPENTDB_BASE = 'https://opentdb.com/api.php';

/** Decode HTML entities from Open Trivia DB (e.g. &quot; → ") */
function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fetch questions from Open Trivia DB on the server (never from the browser).
 * This hides API usage patterns and lets us normalize the shape for the client.
 */
async function fetchOpenTriviaQuestions({ amount = 10, category, difficulty }) {
  const params = new URLSearchParams({
    amount: String(Math.min(Math.max(Number(amount) || 10, 1), 50)),
    type: 'multiple',
  });

  if (category && category !== 'any') params.set('category', category);
  if (difficulty && difficulty !== 'any') params.set('difficulty', difficulty);

  const url = `${OPENTDB_BASE}?${params.toString()}`;
  let lastError;

  // Open Trivia DB is occasionally slow or rate-limits; retry a few times.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`Open Trivia DB HTTP ${response.status}`);
        lastError.statusCode = 502;
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }

      const data = await response.json();
      if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length === 0) {
        const error = new Error(
          'No questions available for this category/difficulty. Try different filters.'
        );
        error.statusCode = 404;
        throw error;
      }

      return data.results.map((q, index) => {
        const correct = decodeHtml(q.correct_answer);
        const incorrect = q.incorrect_answers.map(decodeHtml);
        const options = shuffle([correct, ...incorrect]);
        return {
          id: `otdb-${index}-${Date.now()}`,
          question: decodeHtml(q.question),
          options,
          correctIndex: options.indexOf(correct),
          category: decodeHtml(q.category),
          difficulty: q.difficulty,
        };
      });
    } catch (err) {
      if (err.statusCode === 404) throw err;
      lastError = err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  const error = new Error(
    lastError?.message || 'Failed to fetch questions from Open Trivia DB'
  );
  error.statusCode = 502;
  throw error;
}

async function createCustomQuiz(userId, payload) {
  const quiz = await Quiz.create({
    title: payload.title,
    description: payload.description || '',
    category: payload.category || 'Custom',
    difficulty: payload.difficulty || 'mixed',
    questions: payload.questions,
    createdBy: userId,
    isPublic: payload.isPublic !== false,
  });
  return quiz;
}

async function getAllQuizzes() {
  return Quiz.find({ isPublic: true })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

async function getQuizById(id) {
  const quiz = await Quiz.findById(id).populate('createdBy', 'name').lean();
  if (!quiz) {
    const error = new Error('Quiz not found');
    error.statusCode = 404;
    throw error;
  }
  return quiz;
}

/** Public-safe quiz questions (includes correctIndex for scoring after answer lock) */
function toPlayableQuestions(quiz) {
  return quiz.questions.map((q, index) => ({
    id: `${quiz._id}-${index}`,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    category: quiz.category,
    difficulty: quiz.difficulty,
  }));
}

async function saveSoloResult(userId, result) {
  if (!userId) return null;

  const total = Number(result.total) || 0;
  const score = Number(result.score) || 0;
  // Solo/custom: score is correct count. Multiplayer: score is points; use correctAnswers.
  const correctAnswers =
    typeof result.correctAnswers === 'number'
      ? result.correctAnswers
      : result.mode === 'multiplayer'
        ? 0
        : score;

  return recordQuizResult(userId, {
    quizId: result.quizId || null,
    mode: result.mode || 'solo',
    category: result.category || 'General',
    difficulty: result.difficulty || 'mixed',
    score,
    total,
    correctAnswers,
    playedAt: new Date(),
  });
}

module.exports = {
  fetchOpenTriviaQuestions,
  createCustomQuiz,
  getAllQuizzes,
  getQuizById,
  toPlayableQuestions,
  saveSoloResult,
};
