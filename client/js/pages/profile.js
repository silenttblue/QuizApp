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

    const avg =
      user.quizHistory?.length
        ? Math.round(
            user.quizHistory.reduce((s, h) => s + (h.total ? (h.score / h.total) * 100 : 0), 0) /
              user.quizHistory.length
          )
        : 0;
    $('#statAvg').textContent = `${avg}%`;

    const history = $('#historyList');
    if (!user.quizHistory?.length) {
      history.innerHTML = '<div class="empty-state">No quiz history yet. Play a quiz!</div>';
    } else {
      history.innerHTML = user.quizHistory
        .map(
          (h) => `
        <div class="history-item">
          <div>
            <strong>${escapeHtml(h.mode)}</strong> · ${escapeHtml(h.category || 'General')}
            <div class="muted">${formatDate(h.playedAt)}</div>
          </div>
          <div><strong>${h.score}</strong> / ${h.total}</div>
        </div>`
        )
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
