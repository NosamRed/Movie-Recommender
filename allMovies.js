const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

let currentPage = 1;
let totalPages = 1;
const pageSize = 150; // 30 rows × 5 columns

async function loadPage(page) {
  const resp = await fetch(`${API_BASE}/api/movies/paged?page=${page}&size=${pageSize}`);
  const data = await resp.json();

  currentPage = data.page;
  totalPages = data.totalPages;

  document.getElementById("pageDisplay").textContent =
    `Page ${currentPage} of ${totalPages}`;

  document.getElementById("pageInput").value = currentPage;

  renderMovies(data.movies);

  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = currentPage === totalPages;
}

function renderMovies(movies) {
  const grid = document.getElementById("movie-grid");
  grid.innerHTML = "";

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card-large";

    card.innerHTML = `
      <img src="${movie.poster}" alt="${movie.title}">
      <h3>${movie.title}</h3>
      <p>${movie.year}</p>
    `;

    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
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
});
