/**
 * Socket.io client wrapper
 *
 * The browser opens a WebSocket to the same origin as the Express server.
 * socket.io-client is loaded from CDN on pages that need real-time features.
 */
const SocketClient = {
  socket: null,

  connect() {
    if (this.socket && this.socket.connected) return this.socket;

    if (typeof io === 'undefined') {
      console.error('socket.io client not loaded');
      return null;
    }

    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected', reason);
    });

    this.socket.on('toast', ({ message, type }) => {
      showToast(message, type || 'info');
    });

    this.socket.on('room:error', ({ message }) => {
      showToast(message || 'Room error', 'error');
    });

    return this.socket;
  },

  joinRoom(code, playerId) {
    const s = this.connect();
    if (!s) return;
    s.emit('room:join', { code, playerId });
  },

  startGame(code, playerId) {
    const s = this.connect();
    if (!s) return;
    s.emit('room:start', { code, playerId });
  },

  answer({ code, playerId, questionIndex, selectedIndex }) {
    const s = this.connect();
    if (!s) return;
    s.emit('quiz:answer', { code, playerId, questionIndex, selectedIndex });
  },

  leave() {
    if (!this.socket) return;
    this.socket.emit('room:leave');
  },

  on(event, handler) {
    const s = this.connect();
    if (!s) return;
    s.on(event, handler);
  },

  off(event, handler) {
    if (!this.socket) return;
    this.socket.off(event, handler);
  },
};

window.SocketClient = SocketClient;
