document.addEventListener('DOMContentLoaded', () => {
  const session = loadJSON(STORAGE.room);
  if (!session?.code || !session?.playerId) {
    window.location.href = '/pages/index.html';
    return;
  }

  const codeEl = $('#roomCodeDisplay');
  const listEl = $('#playerList');
  const startBtn = $('#startBtn');
  const copyBtn = $('#copyCodeBtn');
  const waitingMsg = $('#waitingMsg');

  codeEl.textContent = session.code;
  startBtn.style.display = session.isHost ? 'inline-flex' : 'none';
  waitingMsg.textContent = session.isHost
    ? 'Share the code and start when everyone is ready.'
    : 'Waiting for the host to start the game…';

  function renderPlayers(room) {
    const players = room?.players || [];
    listEl.innerHTML = players
      .map(
        (p) => `
      <div class="player-item">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          ${p.connected === false ? '<span class="muted"> (disconnected)</span>' : ''}
        </div>
        ${p.isHost ? '<span class="badge badge-host">Host</span>' : '<span class="badge">Player</span>'}
      </div>`
      )
      .join('');
  }

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(session.code);
      showToast('Room code copied!', 'success');
    } catch {
      showToast('Copy failed — select the code manually', 'warning');
    }
  });

  SocketClient.connect();
  SocketClient.joinRoom(session.code, session.playerId);

  SocketClient.on('room:state', ({ room }) => {
    renderPlayers(room);
    if (room.hostId === session.playerId) {
      session.isHost = true;
      startBtn.style.display = 'inline-flex';
      waitingMsg.textContent = 'Share the code and start when everyone is ready.';
    }
  });

  SocketClient.on('room:player-joined', ({ room, player }) => {
    renderPlayers(room);
    if (player && !player.left) {
      showToast(`${player.name} joined the lobby`, 'success');
    }
  });

  SocketClient.on('room:start', () => {
    showToast('Game starting!', 'success');
    setTimeout(() => {
      window.location.href = '/pages/quiz.html';
    }, 600);
  });

  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    setLoading(true, 'Starting game…');
    SocketClient.startGame(session.code, session.playerId);
    setTimeout(() => setLoading(false), 2000);
  });

  // Initial REST fetch as fallback
  API.get(`/api/room/${session.code}`)
    .then((data) => renderPlayers(data.room))
    .catch(() => showToast('Could not load room', 'error'));
});
