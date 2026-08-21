/**
 * Socket.io real-time multiplayer handler
 *
 * Socket.io keeps a persistent WebSocket connection so the server can
 * push events (new question, leaderboard, player joined) to all clients
 * in a room without polling.
 *
 * Events:
 *  client → server: room:join, room:start, quiz:answer, room:leave
 *  server → client: room:player-joined, room:start, quiz:question,
 *                   quiz:result, quiz:leaderboard, quiz:end, room:error, toast
 */
const { Server } = require('socket.io');
const roomService = require('../services/roomService');
const quizService = require('../services/quizService');

const QUESTION_TIME = Number(process.env.QUESTION_TIME_SECONDS) || 15;
const roomTimers = new Map();

let io;

function clearRoomTimer(code) {
  const t = roomTimers.get(code);
  if (t) {
    clearTimeout(t);
    roomTimers.delete(code);
  }
}

function emitToast(roomCode, message, type = 'info') {
  io.to(roomCode).emit('toast', { message, type });
}

function stripCorrect(question) {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
    category: question.category,
    difficulty: question.difficulty,
  };
}

function advanceQuestion(code) {
  const room = roomService.getRoom(code);
  if (!room || room.status !== 'playing') return;

  room.currentQuestionIndex += 1;

  if (room.currentQuestionIndex >= room.questions.length) {
    room.status = 'finished';
    clearRoomTimer(code);
    io.to(code).emit('quiz:end', {
      leaderboard: roomService.getLeaderboard(room),
      room: roomService.publicRoom(room),
    });
    return;
  }

  const q = room.questions[room.currentQuestionIndex];
  room.questionStartedAt = Date.now();

  io.to(code).emit('quiz:question', {
    index: room.currentQuestionIndex,
    total: room.questions.length,
    timeLimit: QUESTION_TIME,
    question: stripCorrect(q),
    startedAt: room.questionStartedAt,
  });

  clearRoomTimer(code);
  const timer = setTimeout(() => {
    revealAndContinue(code);
  }, QUESTION_TIME * 1000 + 400);
  roomTimers.set(code, timer);
}

function revealAndContinue(code) {
  const room = roomService.getRoom(code);
  if (!room || room.status !== 'playing') return;

  const idx = room.currentQuestionIndex;
  const q = room.questions[idx];
  if (!q) return;

  const results = room.players.map((p) => {
    const ans = p.answers[idx];
    return {
      playerId: p.id,
      name: p.name,
      selectedIndex: ans ? ans.selectedIndex : null,
      correct: ans ? ans.correct : false,
      score: p.score,
    };
  });

  io.to(code).emit('quiz:result', {
    index: idx,
    correctIndex: q.correctIndex,
    results,
  });

  io.to(code).emit('quiz:leaderboard', {
    leaderboard: roomService.getLeaderboard(room),
  });

  clearRoomTimer(code);
  const timer = setTimeout(() => advanceQuestion(code), 2800);
  roomTimers.set(code, timer);
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    socket.data.roomCode = null;
    socket.data.playerId = null;

    socket.on('room:join', ({ code, playerId }) => {
      try {
        const room = roomService.getRoom(code);
        if (!room) {
          socket.emit('room:error', { message: 'Room not found' });
          return;
        }

        const player = room.players.find((p) => p.id === playerId);
        if (!player) {
          socket.emit('room:error', { message: 'Player not found in room. Re-join with the code.' });
          return;
        }

        if (socket.data.roomCode) {
          socket.leave(socket.data.roomCode);
        }

        const roomCode = room.code;
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerId = playerId;
        player.connected = true;
        player.socketId = socket.id;

        io.to(roomCode).emit('room:player-joined', {
          room: roomService.publicRoom(room),
          player: { id: player.id, name: player.name, isHost: player.isHost },
        });

        socket.emit('room:state', { room: roomService.publicRoom(room) });

        // If the game already started (e.g. client navigated to quiz.html),
        // re-send the active question so this socket does not miss it.
        if (room.status === 'playing' && room.currentQuestionIndex >= 0) {
          const q = room.questions[room.currentQuestionIndex];
          if (q) {
            socket.emit('quiz:question', {
              index: room.currentQuestionIndex,
              total: room.questions.length,
              timeLimit: QUESTION_TIME,
              question: stripCorrect(q),
              startedAt: room.questionStartedAt,
            });
            socket.emit('quiz:leaderboard', {
              leaderboard: roomService.getLeaderboard(room),
            });
          }
        }
      } catch (err) {
        socket.emit('room:error', { message: err.message || 'Failed to join room' });
      }
    });

    socket.on('room:start', async ({ code, playerId }) => {
      try {
        const room = roomService.getRoom(code);
        if (!room) {
          socket.emit('room:error', { message: 'Room not found' });
          return;
        }
        if (room.hostId !== playerId) {
          socket.emit('room:error', { message: 'Only the host can start the game' });
          return;
        }
        if (room.status !== 'lobby') {
          socket.emit('room:error', { message: 'Game already started' });
          return;
        }

        socket.emit('toast', { message: 'Fetching questions…', type: 'info' });

        let questions;
        if (room.quizId) {
          const quiz = await quizService.getQuizById(room.quizId);
          questions = quizService.toPlayableQuestions(quiz);
        } else {
          questions = await quizService.fetchOpenTriviaQuestions({
            amount: room.amount,
            category: room.category === 'any' ? undefined : room.category,
            difficulty: room.difficulty === 'any' ? undefined : room.difficulty,
          });
        }

        roomService.setQuestions(room.code, questions);
        roomService.startGame(room.code);

        io.to(room.code).emit('room:start', {
          room: roomService.publicRoom(room),
          totalQuestions: questions.length,
        });

        setTimeout(() => advanceQuestion(room.code), 1200);
      } catch (err) {
        console.error('room:start failed:', err.message);
        socket.emit('room:error', { message: err.message || 'Could not start game' });
        if (code) emitToast(code, err.message || 'Could not start game', 'error');
      }
    });

    socket.on('quiz:answer', ({ code, playerId, questionIndex, selectedIndex }) => {
      try {
        const room = roomService.getRoom(code);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find((p) => p.id === playerId);
        if (!player) return;

        if (questionIndex !== room.currentQuestionIndex) return;
        if (player.answers[questionIndex]) return;

        const q = room.questions[questionIndex];
        if (!q) return;

        const elapsed = (Date.now() - room.questionStartedAt) / 1000;
        if (elapsed > QUESTION_TIME + 1) return;

        const correct = selectedIndex === q.correctIndex;
        let points = 0;
        if (correct) {
          // Faster answers earn a small bonus (max 1000)
          const speedBonus = Math.max(0, Math.round((QUESTION_TIME - elapsed) * 20));
          points = 1000 + speedBonus;
          player.score += points;
        }

        player.answers[questionIndex] = {
          selectedIndex,
          correct,
          points,
          answeredAt: Date.now(),
        };

        socket.emit('quiz:answer-ack', {
          questionIndex,
          correct,
          correctIndex: q.correctIndex,
          points,
          score: player.score,
        });

        const allAnswered = room.players
          .filter((p) => p.connected)
          .every((p) => p.answers[questionIndex]);

        if (allAnswered) {
          revealAndContinue(room.code);
        }
      } catch (err) {
        socket.emit('room:error', { message: err.message || 'Answer failed' });
      }
    });

    socket.on('room:leave', () => {
      handleDisconnect(socket, false);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, true);
    });
  });

  return io;
}

function handleDisconnect(socket, soft) {
  const { roomCode, playerId } = socket.data;
  if (!roomCode || !playerId) return;

  const room = roomService.getRoom(roomCode);
  if (!room) return;

  const player = room.players.find((p) => p.id === playerId);

  if (soft && room.status === 'playing') {
    roomService.setPlayerConnected(roomCode, playerId, false);
    io.to(roomCode).emit('room:player-joined', {
      room: roomService.publicRoom(room),
      player: player ? { id: player.id, name: player.name, left: true } : null,
    });
    emitToast(roomCode, `${player?.name || 'A player'} disconnected`, 'warning');
    return;
  }

  if (room.status === 'lobby') {
    const updated = roomService.removePlayer(roomCode, playerId);
    if (updated) {
      io.to(roomCode).emit('room:player-joined', {
        room: roomService.publicRoom(updated),
        player: player ? { id: player.id, name: player.name, left: true } : null,
      });
      emitToast(roomCode, `${player?.name || 'A player'} left the lobby`, 'info');
    }
  } else {
    roomService.setPlayerConnected(roomCode, playerId, false);
    io.to(roomCode).emit('room:player-joined', {
      room: roomService.publicRoom(room),
      player: player ? { id: player.id, name: player.name, left: true } : null,
    });
  }

  socket.leave(roomCode);
  socket.data.roomCode = null;
  socket.data.playerId = null;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
