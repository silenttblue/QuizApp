document.addEventListener('DOMContentLoaded', async () => {
  const playerName = requirePlayerName();
  $('#hostName').textContent = playerName;
  fillCategorySelect($('#category'), true);

  const customSelect = $('#customQuiz');
  try {
    const data = await API.get('/api/quiz/all');
    const quizzes = data.quizzes || [];
    customSelect.innerHTML =
      '<option value="">Open Trivia DB (default)</option>' +
      quizzes
        .map((q) => `<option value="${q._id}">${escapeHtml(q.title)}</option>`)
        .join('');
  } catch {
    /* optional */
  }

  $('#createRoomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true, 'Creating room…');
    try {
      const body = {
        name: playerName,
        category: $('#category').value,
        difficulty: $('#difficulty').value,
        amount: Number($('#amount').value) || 10,
        quizId: customSelect.value || null,
      };
      const data = await API.post('/api/room/create', body);
      saveJSON(STORAGE.room, {
        code: data.room.code,
        playerId: data.playerId,
        isHost: true,
        name: playerName,
      });
      window.location.href = '/pages/lobby.html';
    } catch (err) {
      showToast(err.message || 'Could not create room', 'error');
    } finally {
      setLoading(false);
    }
  });
});
