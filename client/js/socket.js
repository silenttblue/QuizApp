/**
 * Socket.io client wrapper
 *
 * The browser opens a WebSocket to the same origin as the Express server.
 * socket.io-client is loaded from CDN on pages that need real-time features.
 *
 * IMPORTANT: reuse a single socket instance. Creating a new client whenever
 * `connected` is still false orphans the socket that joined the room, so
 * lobby listeners never receive `room:start` / quiz events.
 */
const SocketClient = {
  socket: null,

  connect() {
    if (typeof io === 'undefined') {
      console.error('socket.io client not loaded');
      return null;
    }

    // Reuse the existing instance (even while connecting / reconnecting)
    if (this.socket) return this.socket;

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

    const doJoin = () => s.emit('room:join', { code, playerId });
    if (s.connected) doJoin();
    else s.once('connect', doJoin);
  },

  startGame(code, playerId) {
    const s = this.connect();
    if (!s) return;

    const doStart = () => s.emit('room:start', { code, playerId });
    if (s.connected) doStart();
    else s.once('connect', doStart);
  },

  answer({ code, playerId, questionIndex, selectedIndex }) {
    const s = this.connect();
    if (!s) return;

    const payload = { code, playerId, questionIndex, selectedIndex };
    if (s.connected) s.emit('quiz:answer', payload);
    else s.once('connect', () => s.emit('quiz:answer', payload));
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
