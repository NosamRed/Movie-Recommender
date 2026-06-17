/* mrScript.js
   Non-invasive: preserves all original containers and classes.
   Requirements:
   - Add id="loginBtn" to your existing login element (anchor or button).
   - Optionally add id="userMenu" and id="logoutBtn" for logout UI.
   - No CSS changes required.
*/

const STORAGE_KEY = 'mr_username';

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
      // remove stored original only if you want
      // delete loginEl.dataset.originalHref;
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

/* Example login request (DEMO). Replace with your backend call if you have one. */
async function performLoginRequest(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username and password required' };
  }

  // Demo mode: accept any credentials for local testing
  const DEMO = true;
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 250));
    return { success: true, username: username };
  }

  // Production example (uncomment and adapt)
  /*
  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!resp.ok) {
      const text = await resp.text();
      return { success: false, message: text || 'Login failed' };
    }
    const data = await resp.json();
    return data && data.success ? { success: true, username: data.username || username } : { success: false, message: data.message || 'Invalid credentials' };
  } catch (err) {
    return { success: false, message: 'Network error' };
  }
  */
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
      clearLoggedInUser();
      // Optionally reload or redirect:
      // window.location.href = 'MovieRecommender.HTML';
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
        window.location.href = 'MovieRecommender.HTML';
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
