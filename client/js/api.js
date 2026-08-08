/**
 * API helper — wraps Fetch for REST calls to the Express backend.
 * All Open Trivia DB traffic goes through the server, never the browser.
 */
const API = {
  base: '',

  getToken() {
    return localStorage.getItem('quizapp_token');
  },

  setAuth(token, user) {
    if (token) localStorage.setItem('quizapp_token', token);
    if (user) localStorage.setItem('quizapp_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('quizapp_token');
    localStorage.removeItem('quizapp_user');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('quizapp_user') || 'null');
    } catch {
      return null;
    }
  },

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.base}${path}`, {
      ...options,
      headers,
    });

    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || 'Unexpected response' };
    }

    if (!res.ok) {
      const err = new Error((data && data.message) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  },

  get(path) {
    return this.request(path);
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  },
};

window.API = API;
