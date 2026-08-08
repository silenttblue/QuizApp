document.addEventListener('DOMContentLoaded', async () => {
  requirePlayerName();
  fillCategorySelect($('#category'));

  const customSelect = $('#customQuiz');
  const useCustom = $('#useCustom');

  try {
    setLoading(true, 'Loading custom quizzes…');
    const data = await API.get('/api/quiz/all');
    const quizzes = data.quizzes || [];
    if (quizzes.length) {
      customSelect.innerHTML =
        '<option value="">Select a custom quiz</option>' +
        quizzes
          .map(
            (q) =>
              `<option value="${q._id}">${escapeHtml(q.title)} (${q.questions?.length || 0} Qs)</option>`
          )
          .join('');
    } else {
      customSelect.innerHTML = '<option value="">No custom quizzes yet</option>';
    }
  } catch {
    customSelect.innerHTML = '<option value="">Could not load custom quizzes</option>';
  } finally {
    setLoading(false);
  }

  useCustom.addEventListener('change', () => {
    const on = useCustom.checked;
    $('#opentdbFields').style.opacity = on ? '0.45' : '1';
    customSelect.disabled = !on;
    $('#category').disabled = on;
    $('#difficulty').disabled = on;
    $('#amount').disabled = on;
  });

  $('#categoryForm').addEventListener('submit', (e) => {
    e.preventDefault();

    if (useCustom.checked) {
      const quizId = customSelect.value;
      if (!quizId) {
        showToast('Select a custom quiz', 'error');
        return;
      }
      saveJSON(STORAGE.soloConfig, { quizId, source: 'custom' });
    } else {
      saveJSON(STORAGE.soloConfig, {
        source: 'opentdb',
        category: $('#category').value,
        difficulty: $('#difficulty').value,
        amount: Number($('#amount').value) || 10,
      });
    }

    window.location.href = '/pages/solo-quiz.html';
  });
});
