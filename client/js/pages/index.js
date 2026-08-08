document.addEventListener('DOMContentLoaded', () => {
  const form = $('#landingForm');
  const nameInput = $('#playerName');
  const errorEl = $('#nameError');
  let mode = 'solo';

  const saved = localStorage.getItem(STORAGE.playerName);
  if (saved) nameInput.value = saved;

  $$('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name.length < 2) {
      errorEl.textContent = 'Please enter a name (at least 2 characters).';
      return;
    }
    errorEl.textContent = '';
    localStorage.setItem(STORAGE.playerName, name);

    if (mode === 'solo') {
      window.location.href = '/pages/solo-category.html';
    } else if (mode === 'create') {
      window.location.href = '/pages/create-room.html';
    } else {
      window.location.href = '/pages/join-room.html';
    }
  });
});
