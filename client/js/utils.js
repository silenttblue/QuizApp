/**
 * Shared UI utilities: toasts, session helpers, nav auth state, loading overlay
 */

const STORAGE = {
  playerName: 'quizapp_player_name',
  soloConfig: 'quizapp_solo_config',
  soloState: 'quizapp_solo_state',
  soloResult: 'quizapp_solo_result',
  room: 'quizapp_room',
  mpResult: 'quizapp_mp_result',
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function showToast(message, type = 'info', duration = 3200) {
  let host = document.querySelector('.toast-container');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-container';
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);

  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 250);
  }, duration);
}

function setLoading(isLoading, label = 'Loading…') {
  let overlay = document.querySelector('.overlay-loading');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay-loading';
    overlay.innerHTML = `<div class="glass" style="padding:1.25rem 1.5rem;display:flex;align-items:center;gap:.75rem">
      <div class="spinner"></div><span class="loading-label">${label}</span></div>`;
    document.body.appendChild(overlay);
  }
  const text = overlay.querySelector('.loading-label');
  if (text) text.textContent = label;
  overlay.classList.toggle('show', !!isLoading);
}

function saveJSON(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function loadJSON(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function requirePlayerName() {
  const name = localStorage.getItem(STORAGE.playerName);
  if (!name) {
    window.location.href = '/pages/index.html';
    return null;
  }
  return name;
}

function updateNavAuth() {
  const user = API.getUser();
  const authSlot = document.querySelector('[data-auth-nav]');
  if (!authSlot) return;

  if (user) {
    authSlot.innerHTML = `
      <a href="/pages/profile.html">${escapeHtml(user.name)}</a>
      <a href="/pages/creator.html">Create Quiz</a>
      <button class="btn btn-ghost" type="button" id="logoutBtn" style="padding:.45rem .8rem">Logout</button>
    `;
    const btn = document.getElementById('logoutBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        API.clearAuth();
        showToast('Logged out', 'info');
        window.location.href = '/pages/index.html';
      });
    }
  } else {
    authSlot.innerHTML = `
      <a href="/pages/login.html">Login</a>
      <a href="/pages/signup.html" class="btn" style="padding:.5rem 1rem">Sign up</a>
    `;
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
}

/** Open Trivia DB category ids */
const CATEGORIES = [
  { id: 'any', name: 'Any Category' },
  { id: '9', name: 'General Knowledge' },
  { id: '10', name: 'Books' },
  { id: '11', name: 'Film' },
  { id: '12', name: 'Music' },
  { id: '14', name: 'Television' },
  { id: '15', name: 'Video Games' },
  { id: '17', name: 'Science & Nature' },
  { id: '18', name: 'Computers' },
  { id: '19', name: 'Mathematics' },
  { id: '21', name: 'Sports' },
  { id: '22', name: 'Geography' },
  { id: '23', name: 'History' },
  { id: '27', name: 'Animals' },
];

function fillCategorySelect(selectEl, includeAny = true) {
  if (!selectEl) return;
  selectEl.innerHTML = CATEGORIES.filter((c) => includeAny || c.id !== 'any')
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join('');
}

document.addEventListener('DOMContentLoaded', updateNavAuth);

window.STORAGE = STORAGE;
window.$ = $;
window.$$ = $$;
window.showToast = showToast;
window.setLoading = setLoading;
window.saveJSON = saveJSON;
window.loadJSON = loadJSON;
window.requirePlayerName = requirePlayerName;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.CATEGORIES = CATEGORIES;
window.fillCategorySelect = fillCategorySelect;
