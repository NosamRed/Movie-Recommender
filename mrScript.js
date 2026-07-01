// mrScript.js
const STORAGE_KEY = 'mr_username';

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

/* Set username on the existing login element without touching classes */
function setLoggedInUser(username) {
  const loginEl = document.getElementById('loginBtn');
  const userMenu = document.getElementById('userMenu');

  if (!loginEl) return;

  // Update visible label only
  loginEl.textContent = username;

  // If it's an anchor, prevent navigation while logged in
  if (loginEl.tagName.toLowerCase() === 'a') {
    // store original href so we can restore on logout
    if (!loginEl.dataset.originalHref) {
      loginEl.dataset.originalHref = loginEl.getAttribute('href') || '';
    }
    loginEl.setAttribute('href', '#');
  }

  try {
    localStorage.setItem(STORAGE_KEY, username);
  } catch (e) {
    console.warn('localStorage unavailable', e);
  }

  if (userMenu) userMenu.style.display = 'block';
}

/* Restore the login label and remove persisted username */
function clearLoggedInUser() {
  const loginEl = document.getElementById('loginBtn');
  const userMenu = document.getElementById('userMenu');

  if (loginEl) {
    loginEl.textContent = 'Login';
    if (loginEl.tagName.toLowerCase() === 'a') {
      const orig = loginEl.dataset.originalHref || 'login.html';
      loginEl.setAttribute('href', orig);
    }
  }

  if (userMenu) userMenu.style.display = 'none';

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('localStorage unavailable', e);
  }
}

/* Restore username from storage on page load */
function restoreUserFromStorage() {
  try {
    const username = localStorage.getItem(STORAGE_KEY);
    if (username) setLoggedInUser(username);
  } catch (e) {
    // ignore
  }
}

/* Real login request: call backend /api/login on API_BASE and return structured result */
async function performLoginRequest(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username and password required' };
  }

  try {
    const resp = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    // Try to parse JSON body if present
    let body = {};
    try { body = await resp.json(); } catch (e) { body = {}; }

    if (!resp.ok) {
      // Expect server to return 401 for not found / invalid credentials
      const message = body.error || body.message || 'Login failed';
      return { success: false, message };
    }

    // Success: server should return minimal user info (e.g., { username })
    return { success: true, username: body.username || username };
  } catch (err) {
    console.error('Network/login error', err);
    return { success: false, message: 'Network error. Try again.' };
  }
}

/* Helper: request recommendations from the Render-hosted backend */
async function getRecommendations(payload) {
  try {
    const resp = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || 'Recommendation request failed');
    }
    return await resp.json();
  } catch (err) {
    console.error('getRecommendations error', err);
    throw err;
  }
}

/* DOM wiring */
document.addEventListener('DOMContentLoaded', function () {
  restoreUserFromStorage();

  const loginEl = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('loginForm'); // if you have a login page/form

  if (loginEl) {
    loginEl.addEventListener('click', function (e) {
      let stored = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch (err) { stored = null; }

      if (stored) {
        // If there's a user menu, toggle it; otherwise prevent navigation so user stays on page
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
          userMenu.style.display = userMenu.style.display === 'block' ? 'none' : 'block';
          e.preventDefault();
        } else {
          if (loginEl.tagName.toLowerCase() === 'a') e.preventDefault();
        }
      } else {
        // Not logged in: allow default behavior (navigate to login page) or open modal if implemented
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      // If you have server-side logout, call it here then clear.
      // Example server-side logout call (uncomment if implemented on server):
      // fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' }).finally(() => clearLoggedInUser());
      clearLoggedInUser();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const usernameInput = document.getElementById('usernameField');
      const passwordInput = document.getElementById('passwordField');
      const username = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      const result = await performLoginRequest(username, password);
      if (result.success) {
        setLoggedInUser(result.username || username);
        window.location.href = 'index.HTML';
      } else {
        const errEl = document.getElementById('loginError');
        if (errEl) { errEl.textContent = result.message || 'Login failed'; errEl.style.display = 'block'; }
      }
    });
  }

  // Hide user menu when clicking outside (if you added one)
  document.addEventListener('click', function (evt) {
    const userMenuEl = document.getElementById('userMenu');
    if (!userMenuEl || userMenuEl.style.display !== 'block') return;
    const loginBtnEl = document.getElementById('loginBtn');
    if (loginBtnEl && (loginBtnEl === evt.target || loginBtnEl.contains(evt.target))) return;
    if (userMenuEl.contains(evt.target)) return;
    userMenuEl.style.display = 'none';
  });
});

/* Debug helpers */
window.debugLoginAs = function (username) { setLoggedInUser(username); };
window.debugLogout = function () { clearLoggedInUser(); };

// Expose recommendation helper for other scripts/pages to call
window.getRecommendations = getRecommendations;
