document.addEventListener('DOMContentLoaded', () => {
  const session = loadJSON(STORAGE.room);
  if (!session?.code || !session?.playerId) {
    window.location.href = '/pages/index.html';
    return;
  }

  const qText = $('#questionText');
  const optionsEl = $('#options');
  const qChip = $('#qChip');
  const scoreChip = $('#scoreChip');
  const timerNum = $('#timerNum');
  const timerBar = $('#timerBar');
  const liveLb = $('#liveLeaderboard');
  const statusEl = $('#statusMsg');

  let currentIndex = -1;
  let locked = false;
  let timerId = null;
  let myScore = 0;

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    timerBar.classList.remove('animate', 'warning');
    timerBar.style.animation = 'none';
  }

  function startTimer(seconds) {
    clearTimer();
    let left = seconds;
    timerNum.textContent = left;
    void timerBar.offsetWidth;
    timerBar.style.animation = '';
    timerBar.style.animationDuration = `${seconds}s`;
    timerBar.classList.add('animate');

    timerId = setInterval(() => {
      left -= 1;
      timerNum.textContent = Math.max(0, left);
      if (left <= 5) timerBar.classList.add('warning');
      if (left <= 0) clearTimer();
    }, 1000);
  }

  function renderLeaderboard(rows) {
    liveLb.innerHTML = (rows || [])
      .slice(0, 5)
      .map(
        (r) => `
      <div class="live-lb-row">
        <span>#${r.rank} ${escapeHtml(r.name)}</span>
        <strong>${r.score}</strong>
      </div>`
      )
      .join('');
  }

  function showQuestion(payload) {
    locked = false;
    currentIndex = payload.index;
    statusEl.textContent = '';
    qChip.textContent = `Question ${payload.index + 1} / ${payload.total}`;
    scoreChip.textContent = `Your score: ${myScore}`;
    qText.textContent = payload.question.question;

    const letters = ['A', 'B', 'C', 'D'];
    optionsEl.innerHTML = payload.question.options
      .map(
        (opt, i) => `
      <button type="button" class="option-btn" data-index="${i}">
        <span class="option-letter">${letters[i]}</span>
        <span>${escapeHtml(opt)}</span>
      </button>`
      )
      .join('');

    $$('.option-btn', optionsEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        const selectedIndex = Number(btn.dataset.index);
        $$('.option-btn', optionsEl).forEach((b) => {
          b.disabled = true;
          if (Number(b.dataset.index) === selectedIndex) b.style.borderColor = 'var(--accent)';
        });
        SocketClient.answer({
          code: session.code,
          playerId: session.playerId,
          questionIndex: currentIndex,
          selectedIndex,
        });
        statusEl.textContent = 'Answer locked — waiting for others…';
      });
    });

    startTimer(payload.timeLimit || 15);
  }

  SocketClient.connect();
  SocketClient.joinRoom(session.code, session.playerId);

  SocketClient.on('quiz:question', (payload) => {
    showQuestion(payload);
  });

  SocketClient.on('quiz:answer-ack', (payload) => {
    myScore = payload.score;
    scoreChip.textContent = `Your score: ${myScore}`;
    $$('.option-btn', optionsEl).forEach((btn) => {
      const i = Number(btn.dataset.index);
      if (i === payload.correctIndex) btn.classList.add('correct');
      else if (i === payload.selectedIndex && !payload.correct) btn.classList.add('wrong');
    });
    if (payload.correct) showToast(`+${payload.points} points!`, 'success');
    else showToast('Wrong answer', 'error');
  });

  SocketClient.on('quiz:result', (payload) => {
    clearTimer();
    locked = true;
    $$('.option-btn', optionsEl).forEach((btn) => {
      btn.disabled = true;
      const i = Number(btn.dataset.index);
      if (i === payload.correctIndex) btn.classList.add('correct');
    });
    statusEl.textContent = 'Revealing results…';
  });

  SocketClient.on('quiz:leaderboard', ({ leaderboard }) => {
    renderLeaderboard(leaderboard);
  });

  SocketClient.on('quiz:end', ({ leaderboard, room }) => {
    clearTimer();
    saveJSON(STORAGE.mpResult, {
      leaderboard,
      room,
      playerId: session.playerId,
      name: session.name,
    });
    showToast('Quiz finished!', 'success');
    setTimeout(() => {
      window.location.href = '/pages/leaderboard.html';
    }, 900);
  });

  SocketClient.on('room:start', () => {
    statusEl.textContent = 'Get ready…';
  });

  statusEl.textContent = 'Connecting to game…';
});
