document.addEventListener('DOMContentLoaded', () => {
  const loginForm = $('#loginForm');
  const signupForm = $('#signupForm');
  const forgotForm = $('#forgotForm');
  const resetForm = $('#resetForm');

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

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#email').value.trim();
      const errEl = $('#formError');
      const successEl = $('#formSuccess');
      errEl.textContent = '';
      successEl.style.display = 'none';
      successEl.textContent = '';

      if (!email) {
        errEl.textContent = 'Email is required.';
        return;
      }

      setLoading(true, 'Sending reset link…');
      try {
        const data = await API.post('/api/auth/forgot-password', { email });
        successEl.textContent =
          data.message ||
          'If an account exists for that email, a password reset link has been sent.';
        successEl.style.display = 'block';
        showToast('Check your email for the reset link', 'success');
        forgotForm.reset();
      } catch (err) {
        errEl.textContent = err.message || 'Could not send reset email';
      } finally {
        setLoading(false);
      }
    });
  }

  if (resetForm) {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token') || '';
    const tokenInput = $('#token');
    if (tokenInput) tokenInput.value = tokenFromUrl;

    if (!tokenFromUrl) {
      const errEl = $('#formError');
      if (errEl) errEl.textContent = 'Missing reset token. Open the link from your email.';
      const submitBtn = resetForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
    }

    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = ($('#token')?.value || tokenFromUrl || '').trim();
      const password = $('#password').value;
      const confirm = $('#confirm').value;
      const errEl = $('#formError');
      errEl.textContent = '';

      if (!token) {
        errEl.textContent = 'Missing reset token. Request a new link.';
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

      setLoading(true, 'Updating password…');
      try {
        const data = await API.post('/api/auth/reset-password', { token, password });
        showToast(data.message || 'Password updated', 'success');
        setTimeout(() => {
          window.location.href = '/pages/login.html';
        }, 700);
      } catch (err) {
        errEl.textContent = err.message || 'Could not reset password';
      } finally {
        setLoading(false);
      }
    });
  }
});
