document.addEventListener('DOMContentLoaded', () => {
  const loginForm = $('#loginForm');
  const signupForm = $('#signupForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#email').value.trim();
      const password = $('#password').value;
      const errEl = $('#formError');
      errEl.textContent = '';

      if (!email || !password) {
        errEl.textContent = 'Email and password are required.';
        return;
      }

      setLoading(true, 'Logging in…');
      try {
        const data = await API.post('/api/auth/login', { email, password });
        API.setAuth(data.token, data.user);
        showToast(`Welcome back, ${data.user.name}!`, 'success');
        window.location.href = '/pages/profile.html';
      } catch (err) {
        errEl.textContent = err.message || 'Login failed';
      } finally {
        setLoading(false);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#name').value.trim();
      const email = $('#email').value.trim();
      const password = $('#password').value;
      const confirm = $('#confirm').value;
      const errEl = $('#formError');
      errEl.textContent = '';

      if (name.length < 2) {
        errEl.textContent = 'Name must be at least 2 characters.';
        return;
      }
      if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        return;
      }
      if (password !== confirm) {
        errEl.textContent = 'Passwords do not match.';
        return;
      }

      setLoading(true, 'Creating account…');
      try {
        const data = await API.post('/api/auth/signup', { name, email, password });
        API.setAuth(data.token, data.user);
        showToast('Account created!', 'success');
        window.location.href = '/pages/profile.html';
      } catch (err) {
        errEl.textContent = err.message || 'Signup failed';
      } finally {
        setLoading(false);
      }
    });
  }
});
