/**
 * In-memory room store for multiplayer lobbies.
 * Rooms are ephemeral game sessions — MongoDB is used for users/quizzes,
 * while active rooms live in memory for speed and Socket.io sync.
 */
const crypto = require('crypto');

const rooms = new Map();

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

function createRoom({ hostName, hostId, quizId = null, category = '9', difficulty = 'medium', amount = 10 }) {
  let code = generateRoomCode();
  while (rooms.has(code)) code = generateRoomCode();

  const room = {
    code,
    hostId,
    hostName,
    quizId,
    category,
    difficulty,
    amount,
    status: 'lobby', // lobby | playing | finished
    players: [
      {
        id: hostId,
        name: hostName,
        score: 0,
        isHost: true,
        connected: true,
        answers: {},
      },
    ],
    questions: [],
    currentQuestionIndex: -1,
    questionStartedAt: null,
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  if (!code) return null;
  return rooms.get(String(code).toUpperCase()) || null;
}

function joinRoom(code, { playerId, playerName }) {
  const room = getRoom(code);
  if (!room) {
    const error = new Error('Room not found');
    error.statusCode = 404;
    throw error;
  }
  if (room.status !== 'lobby') {
    const error = new Error('Game already started');
    error.statusCode = 400;
    throw error;
  }
  if (room.players.length >= 10) {
    const error = new Error('Room is full (max 10 players)');
    error.statusCode = 400;
    throw error;
  }

  const existing = room.players.find(
    (p) => p.name.toLowerCase() === playerName.toLowerCase()
  );
  if (existing) {
    const error = new Error('Name already taken in this room');
    error.statusCode = 400;
    throw error;
  }

  const player = {
    id: playerId,
    name: playerName,
    score: 0,
    isHost: false,
    connected: true,
    answers: {},
  };
  room.players.push(player);
  return { room, player };
}

function publicRoom(room) {
  if (!room) return null;
  return {
    code: room.code,
    hostId: room.hostId,
    hostName: room.hostName,
    quizId: room.quizId,
    category: room.category,
    difficulty: room.difficulty,
    amount: room.amount,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
    })),
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    createdAt: room.createdAt,
  };
}

function setPlayerConnected(code, playerId, connected) {
  const room = getRoom(code);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.connected = connected;
  return room;
}

function removePlayer(code, playerId) {
  const room = getRoom(code);
  if (!room) return null;

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    rooms.delete(room.code);
    return null;
  }

  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
    room.hostName = room.players[0].name;
    room.players[0].isHost = true;
  }

  return room;
}

function setQuestions(code, questions) {
  const room = getRoom(code);
  if (!room) return null;
  room.questions = questions;
  return room;
}

function startGame(code) {
  const room = getRoom(code);
  if (!room) {
    const error = new Error('Room not found');
    error.statusCode = 404;
    throw error;
  }
  if (room.status !== 'lobby') {
    const error = new Error('Game already started');
    error.statusCode = 400;
    throw error;
  }
  if (room.players.length < 1) {
    const error = new Error('Need at least one player');
    error.statusCode = 400;
    throw error;
  }
  room.status = 'playing';
  room.currentQuestionIndex = -1;
  room.players.forEach((p) => {
    p.score = 0;
    p.answers = {};
  });
  return room;
}

function getLeaderboard(room) {
  const totalQuestions = room.questions?.length || 0;
  return [...room.players]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p, index) => {
      const answers = p.answers || {};
      const correctAnswers = Object.values(answers).filter((a) => a && a.correct).length;
      return {
        rank: index + 1,
        id: p.id,
        name: p.name,
        score: p.score,
        isHost: p.isHost,
        correctAnswers,
        totalQuestions,
      };
    });
}

function deleteRoom(code) {
  rooms.delete(String(code).toUpperCase());
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  publicRoom,
  setPlayerConnected,
  removePlayer,
  setQuestions,
  startGame,
  getLeaderboard,
  deleteRoom,
  rooms,
};
