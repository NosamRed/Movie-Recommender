"use strict";

document.addEventListener('DOMContentLoaded', function () {
  const loginToggle = document.getElementById('login-toggle');
  const loginForm = document.getElementById('login-form');
  const submitLogin = document.getElementById('submit-login');

  // Toggle login panel
  loginToggle.addEventListener('click', function () {
    const isHidden = loginForm.classList.toggle('hidden');
    loginForm.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
  });

  // Example submit handler
  submitLogin.addEventListener('click', function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    // Replace with real auth logic
    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }
    // Simulate successful login
    alert('Logged in as ' + username);
    loginForm.classList.add('hidden');
    loginForm.setAttribute('aria-hidden', 'true');
  });
});
