document.addEventListener('DOMContentLoaded', function () {
  const loginToggle = document.getElementById('login-toggle');
  const loginForm = document.getElementById('login-form');
  const submitLogin = document.getElementById('submit-login');

  // Toggle login panel
  loginToggle.addEventListener('click', function () {
    const isHidden = loginForm.classList.toggle('hidden');
    loginForm.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
  });

  // Submit handler
  submitLogin.addEventListener('click', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin'
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // server returns { error: '...' } on failure
        alert(data.error || 'Login failed');
        return;
      }


      alert('Logged in as ' + (data.user?.username || username));

      if (data.token) {
        try {
          localStorage.setItem('authToken', data.token);
        } catch (err) {
        }
      }

      loginForm.classList.add('hidden');
      loginForm.setAttribute('aria-hidden', 'true');
    } catch (err) {
      console.error('Login request failed', err);
      alert('Network error. Please try again.');
    }
  });
});
