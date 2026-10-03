const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

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
    showEmptyMessage("You haven't favorited any movies yet.");
    return;
  }

  hideEmptyMessage();

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card-large";

    card.innerHTML = `
      <img src="${movie.poster}" alt="${movie.title}">
      <h3>${movie.title}</h3>
      <p>${movie.year}</p>
    `;

    // favorites.js — every star here starts filled; unfavoriting removes the card
    addFavoriteStar(card, movie._id, (isFavorited) => {
      if (!isFavorited) {
        card.remove();
        if (!grid.children.length) {
          showEmptyMessage("You haven't favorited any movies yet.");
        }
      }
    });

    card.onclick = () => {
      window.location.href = `movie.html?id=${movie._id}`;
    };

    grid.appendChild(card);
  });
}

async function loadFavoriteMovies() {
  const username = getCurrentUsername(); // favorites.js
  if (!username) {
    window.location.href = "login.html";
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/favorites/${encodeURIComponent(username)}/movies`);
    if (!resp.ok) throw new Error("Failed to load favorite movies");
    const data = await resp.json();
    renderMovies(data.movies || []);
  } catch (err) {
    console.error("loadFavoriteMovies error:", err);
    document.getElementById("movie-grid").innerHTML = "";
    showEmptyMessage("Something went wrong loading your favorites.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadFavorites(); // favorites.js — populates the favorited set used by addFavoriteStar
  loadFavoriteMovies();
});