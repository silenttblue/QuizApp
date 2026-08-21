document.addEventListener('DOMContentLoaded', async () => {
  const playerName = requirePlayerName();
  const config = loadJSON(STORAGE.soloConfig);
  if (!config) {
    window.location.href = '/pages/solo-category.html';
    return;
  }

  const TIME = 15;
  let questions = [];
  let index = 0;
  let score = 0;
  let locked = false;
  let timerId = null;
  let review = [];

  const qText = $('#questionText');
  const optionsEl = $('#options');
  const scoreChip = $('#scoreChip');
  const qChip = $('#qChip');
  const timerNum = $('#timerNum');
  const timerBar = $('#timerBar');
  const nextBtn = $('#nextBtn');
  const feedback = $('#feedback');

  async function loadQuestions() {
    setLoading(true, 'Fetching questions…');
    try {
      let url = '/api/quiz/questions?';
      if (config.source === 'custom' && config.quizId) {
        url += `quizId=${encodeURIComponent(config.quizId)}`;
      } else {
        const params = new URLSearchParams({
          amount: String(config.amount || 10),
          category: config.category || 'any',
          difficulty: config.difficulty || 'any',
        });
        url += params.toString();
      }
      const data = await API.get(url);
      questions = data.questions || [];
      if (!questions.length) throw new Error('No questions returned');
      renderQuestion();
    } catch (err) {
      showToast(err.message || 'Failed to load questions', 'error');
      setTimeout(() => {
        window.location.href = '/pages/solo-category.html';
      }, 1600);
    } finally {
      setLoading(false);
    }
  }

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    timerBar.classList.remove('animate', 'warning');
    timerBar.style.animation = 'none';
  }

  function startTimer() {
    clearTimer();
    let left = TIME;
    timerNum.textContent = left;
    // restart CSS animation
    void timerBar.offsetWidth;
    timerBar.style.animation = '';
    timerBar.style.animationDuration = `${TIME}s`;
    timerBar.classList.add('animate');

    timerId = setInterval(() => {
      left -= 1;
      timerNum.textContent = Math.max(0, left);
      if (left <= 5) timerBar.classList.add('warning');
      if (left <= 0) {
        clearTimer();
        if (!locked) lockAnswer(null, true);
      }
    }, 1000);
  }

  function renderQuestion() {
    locked = false;
    nextBtn.disabled = true;
    feedback.textContent = '';
    const q = questions[index];
    qChip.textContent = `Question ${index + 1} / ${questions.length}`;
    scoreChip.textContent = `Score: ${score}`;
    qText.textContent = q.question;

    const letters = ['A', 'B', 'C', 'D'];
    optionsEl.innerHTML = q.options
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
        lockAnswer(Number(btn.dataset.index), false);
      });
    });

    startTimer();
  }

  function lockAnswer(selectedIndex, timedOut) {
    locked = true;
    clearTimer();
    const q = questions[index];
    const correct = selectedIndex === q.correctIndex;

    $$('.option-btn', optionsEl).forEach((btn) => {
      btn.disabled = true;
      const i = Number(btn.dataset.index);
      if (i === q.correctIndex) btn.classList.add('correct');
      else if (i === selectedIndex && !correct) btn.classList.add('wrong');
      else btn.classList.add('locked');
    });

    if (timedOut) {
      feedback.textContent = 'Time is up!';
      showToast('Time is up!', 'warning');
    } else if (correct) {
      score += 1;
      feedback.textContent = 'Correct!';
      showToast('Correct!', 'success');
    } else {
      feedback.textContent = 'Wrong answer';
      showToast('Wrong answer', 'error');
    }

    scoreChip.textContent = `Score: ${score}`;
    review.push({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex,
      correct: !!correct && !timedOut,
    });

    nextBtn.disabled = false;
  }

  nextBtn.addEventListener('click', async () => {
    if (index + 1 >= questions.length) {
      const result = {
        playerName,
        score,
        total: questions.length,
        review,
        config,
        finishedAt: new Date().toISOString(),
      };
  
      saveJSON(STORAGE.soloResult, result);
  
      try {
        await API.post('/api/quiz/result', {
          mode: config.source === 'custom' ? 'custom' : 'solo',
          quizId: config.quizId || null,
          category: config.category || 'General',
          difficulty: config.difficulty || 'mixed',
          score,
          total: questions.length,
          correctAnswers: score,
        });
      } catch (err) {
        console.error('FAILED TO SAVE SOLO RESULT:', err);
      }
  
      window.location.href = '/pages/solo-result.html';
      return;
    }
  
    index += 1;
    renderQuestion();
  });

  loadQuestions();
});
