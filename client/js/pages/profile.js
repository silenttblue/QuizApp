document.addEventListener('DOMContentLoaded', async () => {
  if (!API.getToken()) {
    window.location.href = '/pages/login.html';
    return;
  }

  setLoading(true, 'Loading profile…');
  try {
    const data = await API.get('/api/auth/profile');
    const user = data.user;
    API.setAuth(API.getToken(), user);

    $('#profileName').textContent = user.name;
    $('#profileEmail').textContent = user.email;
    $('#statGames').textContent = user.quizHistory?.length || 0;
    $('#statHigh').textContent = user.highestScore || 0;

    /**
     * Resolve correct-answer count for accuracy.
     * - New records: use correctAnswers
     * - Legacy solo/custom: score <= total means score was correct count
     * - Legacy multiplayer points (score > total): exclude from accuracy avg
     */
    function resolveCorrectAnswers(h) {
      if (typeof h.correctAnswers === 'number' && !Number.isNaN(h.correctAnswers)) {
        return h.correctAnswers;
      }
      if (h.total > 0 && h.score <= h.total) return h.score;
      return null;
    }

    const accuracySamples = (user.quizHistory || [])
      .map((h) => {
        const correct = resolveCorrectAnswers(h);
        if (correct == null || !h.total) return null;
        return (correct / h.total) * 100;
      })
      .filter((v) => v != null);

    const avg = accuracySamples.length
      ? Math.round(accuracySamples.reduce((s, v) => s + v, 0) / accuracySamples.length)
      : 0;
    $('#statAvg').textContent = `${avg}%`;

    const history = $('#historyList');
    if (!user.quizHistory?.length) {
      history.innerHTML = '<div class="empty-state">No quiz history yet. Play a quiz!</div>';
    } else {
      history.innerHTML = user.quizHistory
        .map((h) => {
          const correct = resolveCorrectAnswers(h);
          const isPoints = h.mode === 'multiplayer' || (correct == null && h.score > h.total);
          const detail = isPoints
            ? `${h.score} pts${correct != null && h.total ? ` · ${correct}/${h.total}` : ''}`
            : `${h.score} / ${h.total}`;
          return `
        <div class="history-item">
          <div>
            <strong>${escapeHtml(h.mode)}</strong> · ${escapeHtml(h.category || 'General')}
            <div class="muted">${formatDate(h.playedAt)}</div>
          </div>
          <div><strong>${detail}</strong></div>
        </div>`;
        })
        .join('');
    }

    // Also list user's view of public quizzes
    const quizData = await API.get('/api/quiz/all');
    const mine = (quizData.quizzes || []).filter((q) => {
      if (!q.createdBy) return false;
      const creatorId = String(q.createdBy._id || q.createdBy);
      return creatorId === String(user.id);
    });
    const myQuizzes = $('#myQuizzes');
    if (!mine.length) {
      myQuizzes.innerHTML = '<div class="empty-state">You have not created any quizzes yet.</div>';
    } else {
      myQuizzes.innerHTML = mine
        .map(
          (q) => `
        <div class="quiz-list-item">
          <div>
            <strong>${escapeHtml(q.title)}</strong>
            <div class="muted">${q.questions?.length || 0} questions · ${escapeHtml(q.difficulty)}</div>
          </div>
          <a class="btn btn-ghost" style="padding:.5rem .9rem" href="/pages/solo-category.html">Play</a>
        </div>`
        )
        .join('');
    }
  } catch (err) {
    if (err.status === 401) {
      API.clearAuth();
      window.location.href = '/pages/login.html';
      return;
    }
    showToast(err.message || 'Failed to load profile', 'error');
  } finally {
    setLoading(false);
  }
});
