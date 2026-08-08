document.addEventListener('DOMContentLoaded', () => {
  const result = loadJSON(STORAGE.soloResult);
  if (!result) {
    window.location.href = '/pages/index.html';
    return;
  }

  const pct = Math.round((result.score / result.total) * 100);
  $('#resultTitle').textContent = pct >= 70 ? 'Great job!' : pct >= 40 ? 'Nice try!' : 'Keep practicing!';
  $('#resultScore').textContent = `${result.score} / ${result.total}`;
  $('#resultPct').textContent = `${pct}% correct`;
  $('#resultName').textContent = result.playerName || 'Player';

  const reviewEl = $('#reviewList');
  reviewEl.innerHTML = (result.review || [])
    .map((r, i) => {
      const your = r.selectedIndex == null ? 'No answer' : escapeHtml(r.options[r.selectedIndex]);
      const correct = escapeHtml(r.options[r.correctIndex]);
      return `
        <div class="history-item">
          <div>
            <strong>Q${i + 1}.</strong> ${escapeHtml(r.question)}
            <div class="muted" style="margin-top:.35rem">Your answer: ${your}</div>
            <div class="muted">Correct: ${correct}</div>
          </div>
          <span class="badge ${r.correct ? 'badge-host' : ''}">${r.correct ? 'Correct' : 'Wrong'}</span>
        </div>`;
    })
    .join('');
});
