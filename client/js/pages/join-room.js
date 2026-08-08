document.addEventListener('DOMContentLoaded', () => {
  const playerName = requirePlayerName();
  $('#playerLabel').textContent = playerName;

  $('#joinRoomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('#roomCode').value.trim().toUpperCase();
    if (code.length < 4) {
      showToast('Enter a valid room code', 'error');
      return;
    }

    setLoading(true, 'Joining room…');
    try {
      const data = await API.post('/api/room/join', { name: playerName, code });
      saveJSON(STORAGE.room, {
        code: data.room.code,
        playerId: data.playerId,
        isHost: false,
        name: playerName,
      });
      window.location.href = '/pages/lobby.html';
    } catch (err) {
      showToast(err.message || 'Could not join room', 'error');
    } finally {
      setLoading(false);
    }
  });
});
