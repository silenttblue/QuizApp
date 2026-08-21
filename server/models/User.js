const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User model
 * - passwords are hashed with bcrypt before save (never store plain text)
 * - quizHistory tracks past scores for the profile page
 */
const quizHistorySchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null },
    mode: { type: String, enum: ['solo', 'multiplayer', 'custom'], required: true },
    category: { type: String, default: 'General' },
    difficulty: { type: String, default: 'mixed' },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    /** Number of correct answers (for accuracy). Distinct from score when score is MP points. */
    correctAnswers: { type: Number, default: undefined },
    playedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    highestScore: { type: Number, default: 0 },
    quizHistory: { type: [quizHistorySchema], default: [] },
    /** SHA-256 hash of the one-time reset token (never store the raw token) */
    resetPasswordToken: { type: String, select: false, default: undefined },
    resetPasswordExpires: { type: Date, select: false, default: undefined },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
