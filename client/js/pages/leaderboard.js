document.addEventListener('DOMContentLoaded', () => {
  const result = loadJSON(STORAGE.mpResult);
  if (!result?.leaderboard) {
    window.location.href = '/pages/index.html';
    return;
  }

  const winner = result.leaderboard[0];
  $('#winnerName').textContent = winner ? winner.name : '—';
  $('#winnerScore').textContent = winner ? `${winner.score} pts` : '';

  const me = result.leaderboard.find((p) => p.id === result.playerId);
  if (me) {
    $('#yourPlace').textContent = `You placed #${me.rank} with ${me.score} points`;
  }

  const list = $('#leaderboardList');
  list.innerHTML = result.leaderboard
    .map(
      (row, i) => `
    <div class="lb-item" style="animation-delay:${i * 0.08}s">
      <div class="lb-rank">#${row.rank}</div>
      <div>
        <strong>${escapeHtml(row.name)}</strong>
        ${row.id === result.playerId ? '<span class="muted"> (you)</span>' : ''}
      </div>
      <div class="lb-score">${row.score}</div>
    </div>`
    )
    .join('');

  // Save multiplayer result for logged-in users (score = points; correctAnswers for accuracy)
  if (me && API.getToken()) {
    const totalQuestions =
      me.totalQuestions || result.room?.totalQuestions || 0;
    API.post('/api/quiz/result', {
      mode: 'multiplayer',
      category: result.room?.category || 'multiplayer',
      difficulty: result.room?.difficulty || 'mixed',
      score: me.score,
      total: totalQuestions,
      correctAnswers: typeof me.correctAnswers === 'number' ? me.correctAnswers : 0,
    }).catch((err) => {
      console.error('FAILED TO SAVE MULTIPLAYER RESULT:', err);
    });
  }
});
