const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
const pageSize = 150; // 30 rows × 5 columns

async function loadPage(page) {
  const params = new URLSearchParams({ page, size: pageSize });
  if (currentSearch) params.set("search", currentSearch);

  let data;
  try {
    const resp = await fetch(`${API_BASE}/api/movies/paged?${params.toString()}`);
    data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `Request failed (${resp.status})`);
  } catch (err) {
    console.error("loadPage error:", err);
    document.getElementById("pageDisplay").textContent = "Error loading movies";
    document.getElementById("movie-grid").innerHTML =
      `<p class="muted">Couldn't load movies: ${escapeHtml(err.message)}</p>`;
    return;
  }

  currentPage = data.page;
  totalPages = data.totalPages;

  document.getElementById("pageDisplay").textContent =
    data.total === 0 ? "No movies found" : `Page ${currentPage} of ${totalPages}`;

  document.getElementById("pageInput").value = currentPage;

  renderMovies(data.movies);

  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = currentPage === totalPages;
}

function renderMovies(movies) {
  const grid = document.getElementById("movie-grid");
  grid.innerHTML = "";

  if (movies.length === 0) {
    grid.innerHTML = `<p class="muted">No movies match "${escapeHtml(currentSearch)}".</p>`;
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card-large";

    card.innerHTML = `
      <img src="${movie.poster}" alt="${movie.title}">
      <h3>${movie.title}</h3>
      <p>${movie.year}</p>
    `;

    // favorites.js — adds the clickable star, top-right of the card
    addFavoriteStar(card, movie._id);

    // Click → movie details page
    card.onclick = () => {
      window.location.href = `movie.html?id=${movie._id}`;
    };

    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadFavorites(); // favorites.js — load before the first render so stars start correct

  loadPage(1);

  document.getElementById("prevBtn").onclick = () => {
    if (currentPage > 1) loadPage(currentPage - 1);
  };

  document.getElementById("nextBtn").onclick = () => {
    if (currentPage < totalPages) loadPage(currentPage + 1);
  };

  document.getElementById("goBtn").onclick = () => {
    const newPage = parseInt(document.getElementById("pageInput").value, 10);
    if (newPage >= 1 && newPage <= totalPages) {
      loadPage(newPage);
    }
  };

  // Live search by title — debounced so it doesn't fire a request on every keystroke
  let searchDebounceTimer = null;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    const value = e.target.value;
    searchDebounceTimer = setTimeout(() => {
      currentSearch = value.trim();
      loadPage(1); // a new search always starts back at page 1
    }, 300);
  });
});