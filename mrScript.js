// mrScript.js
const STORAGE_KEY = 'mr_username';

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

/* ---------------- LOGIN STATE ---------------- */

function setLoggedInUser(username) {
  const loginEl = document.getElementById('loginBtn');
  const userMenu = document.getElementById('userMenu');

  if (!loginEl) return;

  loginEl.textContent = username;

  if (loginEl.tagName.toLowerCase() === 'a') {
    if (!loginEl.dataset.originalHref) {
      loginEl.dataset.originalHref = loginEl.getAttribute('href') || '';
    }
    loginEl.setAttribute('href', '#');
  }

  try { localStorage.setItem(STORAGE_KEY, username); } catch (e) {}

  if (userMenu) userMenu.style.display = 'block';
}

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

  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

function restoreUserFromStorage() {
  try {
    const username = localStorage.getItem(STORAGE_KEY);
    if (username) setLoggedInUser(username);
  } catch (e) {}
}

/* ---------------- LOGIN REQUEST ---------------- */

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

    let body = {};
    try { body = await resp.json(); } catch (e) {}

    if (!resp.ok) {
      const message = body.error || body.message || 'Login failed';
      return { success: false, message };
    }

    return { success: true, username: body.username || username };
  } catch (err) {
    console.error('Network/login error', err);
    return { success: false, message: 'Network error. Try again.' };
  }
}

/* ---------------- RECOMMENDATION REQUEST ---------------- */

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

/* ---------------- COMPACT MOVIE FETCHING ---------------- */

async function fetchMovies() {
  try {
    const resp = await fetch(`${API_BASE}/api/movies?fields=_id,title,year,poster`);
    if (!resp.ok) throw new Error("Failed to fetch movies");
    return await resp.json();
  } catch (err) {
    console.error("fetchMovies error:", err);
    return [];
  }
}

function renderMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";
  card.innerHTML = `
    <div class="movie-poster">
      <img src="${movie.poster}" alt="${movie.title} poster">
    </div>
    <div class="movie-meta">
      <h3 class="movie-title">${movie.title}</h3>
      <div class="movie-sub">${movie.year}</div>
    </div>
  `;

  // Make card clickable → movie details page
  card.onclick = () => {
    window.location.href = `movie.html?id=${movie._id}`;
  };

  return card;
}

function populateMovieList(movies) {
  const listEl = document.getElementById("movie-list");
  if (!listEl) return;
  listEl.innerHTML = "";
  movies.slice(0, 4).forEach(m => listEl.appendChild(renderMovieCard(m)));
}

/* ---------------- DOM LOADED ---------------- */

document.addEventListener('DOMContentLoaded', async function () {
  restoreUserFromStorage();

  const loginEl = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('loginForm');

  if (loginEl) {
    loginEl.addEventListener('click', function (e) {
      let stored = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch (err) {}

      if (stored) {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
          userMenu.style.display = userMenu.style.display === 'block' ? 'none' : 'block';
          e.preventDefault();
        } else {
          if (loginEl.tagName.toLowerCase() === 'a') e.preventDefault();
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      clearLoggedInUser();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const username = document.getElementById('usernameField').value.trim();
      const password = document.getElementById('passwordField').value;

      const result = await performLoginRequest(username, password);
      if (result.success) {
        setLoggedInUser(result.username || username);
        window.location.href = 'index.HTML';
      } else {
        const errEl = document.getElementById('loginError');
        if (errEl) {
          errEl.textContent = result.message || 'Login failed';
          errEl.style.display = 'block';
        }
      }
    });
  }

  // Load compact movie list (4 movies)
  const movies = await fetchMovies();
  populateMovieList(movies);

  // Show All Movies button → open allMovies.html
  const toggleBtn = document.getElementById("toggleViewBtn");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      window.location.href = "allMovies.html";
    };
  }
});

/* Debug helpers */
window.debugLoginAs = function (username) { setLoggedInUser(username); };
window.debugLogout = function () { clearLoggedInUser(); };
window.getRecommendations = getRecommendations;
