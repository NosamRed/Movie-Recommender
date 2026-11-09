const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

const EMPTY_TEXT = 'You haven\'t added any movies yet. Click "+ Add a Movie" to add one.';

function showEmptyMessage(text) {
  const emptyMsg = document.getElementById("emptyMessage");
  emptyMsg.textContent = text;
  emptyMsg.style.display = "block";
}

function hideEmptyMessage() {
  document.getElementById("emptyMessage").style.display = "none";
}

function renderMovies(movies) {
  const grid = document.getElementById("movie-grid");
  grid.innerHTML = "";

  if (movies.length === 0) {
    showEmptyMessage(EMPTY_TEXT);
    return;
  }

  hideEmptyMessage();

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card-large";

    // safeText / posterSrc come from favorites.js
    card.innerHTML = `
      <img src="${posterSrc(movie.poster)}" alt="${safeText(movie.title)}">
      <h3>${safeText(movie.title)}</h3>
      <p>${safeText(movie.year)}</p>
    `;

    // favorites.js — you can favorite your own movies too
    addFavoriteStar(card, movie._id);

    card.onclick = () => {
      window.location.href = `movie.html?id=${encodeURIComponent(movie._id)}`;
    };

    grid.appendChild(card);
  });
}

async function loadAddedMovies() {
  const username = getCurrentUsername(); // favorites.js
  if (!username) {
    window.location.href = "login.html";
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/added-movies/${encodeURIComponent(username)}`);
    if (!resp.ok) throw new Error("Failed to load added movies");
    const data = await resp.json();
    renderMovies(data.movies || []);
  } catch (err) {
    console.error("loadAddedMovies error:", err);
    document.getElementById("movie-grid").innerHTML = "";
    showEmptyMessage("Something went wrong loading your added movies.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("addMovieBtn").onclick = () => {
    window.location.href = "movieAdder.html";
  };

  await loadFavorites(); // favorites.js — so stars start in the right state
  loadAddedMovies();
});