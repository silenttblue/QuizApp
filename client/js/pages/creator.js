document.addEventListener('DOMContentLoaded', () => {
  if (!API.getToken()) {
    showToast('Please log in to create quizzes', 'warning');
    setTimeout(() => {
      window.location.href = '/pages/login.html';
    }, 800);
    return;
  }

  const questionsHost = $('#questionsHost');
  let questionCount = 0;

  function addQuestion(prefill) {
    questionCount += 1;
    const id = questionCount;
    const wrap = document.createElement('div');
    wrap.className = 'question-builder';
    wrap.dataset.qid = id;
    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
        <h3>Question ${id}</h3>
        <button type="button" class="btn btn-ghost remove-q" style="padding:.4rem .7rem">Remove</button>
      </div>
      <div class="form-group">
        <label>Question text</label>
        <input class="form-control q-text" required maxlength="400" placeholder="Enter the question" value="${escapeHtml(prefill?.question || '')}" />
      </div>
      ${[0, 1, 2, 3]
        .map(
          (i) => `
        <div class="option-row">
          <input type="radio" name="correct-${id}" value="${i}" ${
            (prefill?.correctIndex ?? 0) === i ? 'checked' : ''
          } required />
          <input class="form-control q-opt" data-opt="${i}" required maxlength="200" placeholder="Option ${
            String.fromCharCode(65 + i)
          }" value="${escapeHtml(prefill?.options?.[i] || '')}" />
        </div>`
        )
        .join('')}
      <p class="muted" style="margin-top:.35rem">Select the radio button next to the correct answer.</p>
    `;
    questionsHost.appendChild(wrap);
    wrap.querySelector('.remove-q').addEventListener('click', () => {
      if ($$('.question-builder').length <= 1) {
        showToast('Keep at least one question', 'warning');
        return;
      }
      wrap.remove();
    });
  }

  $('#addQuestionBtn').addEventListener('click', () => addQuestion());
  addQuestion();

  $('#creatorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const blocks = $$('.question-builder');
    const questions = [];

    for (const block of blocks) {
      const question = block.querySelector('.q-text').value.trim();
      const options = $$('.q-opt', block).map((el) => el.value.trim());
      const checked = block.querySelector('input[type="radio"]:checked');
      if (!question || options.some((o) => !o) || !checked) {
        showToast('Fill all fields and mark a correct answer for each question', 'error');
        return;
      }
      questions.push({
        question,
        options,
        correctIndex: Number(checked.value),
      });
    }

    const payload = {
      title: $('#title').value.trim(),
      description: $('#description').value.trim(),
      category: $('#category').value.trim() || 'Custom',
      difficulty: $('#difficulty').value,
      questions,
    };

    setLoading(true, 'Saving quiz…');
    try {
      await API.post('/api/quiz/create', payload);
      showToast('Quiz created successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/pages/profile.html';
      }, 700);
    } catch (err) {
      showToast(err.message || 'Failed to create quiz', 'error');
    } finally {
      setLoading(false);
    }
  });
});
