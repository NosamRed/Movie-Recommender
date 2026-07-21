const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

function getMovieId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadMovie() {
  const id = getMovieId();
  const resp = await fetch(`${API_BASE}/api/movie/${id}`);
  const movie = await resp.json();

  renderMovie(movie);
}

function renderMovie(movie) {
  const container = document.getElementById("movie-details");

  container.innerHTML = `
    <div class="movie-header">
      <img src="${movie.poster}" class="movie-detail-poster">
      <div>
        <h1>${movie.title}</h1>
        <p>${movie.year}</p>
        <p>Rated: ${movie.rated || "N/A"}</p>
        <p>Runtime: ${movie.runtime || "N/A"} minutes</p>
      </div>
    </div>

    <h2>Plot</h2>
    <p>${movie.fullplot || movie.plot || "No plot available."}</p>

    <h2>Cast</h2>
    <p>${movie.cast?.join(", ") || "N/A"}</p>

    <h2>Directors</h2>
    <p>${movie.directors?.join(", ") || "N/A"}</p>

    <h2>Genres</h2>
    <p>${movie.genres?.join(", ") || "N/A"}</p>

    <h2>Languages</h2>
    <p>${movie.languages?.join(", ") || "N/A"}</p>

    <h2>Countries</h2>
    <p>${movie.countries?.join(", ") || "N/A"}</p>

    <h2>Awards</h2>
    <pre>${JSON.stringify(movie.awards, null, 2)}</pre>

    <h2>IMDb</h2>
    <pre>${JSON.stringify(movie.imdb, null, 2)}</pre>

    <h2>Tomatoes</h2>
    <pre>${JSON.stringify(movie.tomatoes, null, 2)}</pre>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  loadMovie();

  document.getElementById("backBtn").onclick = () => {
    if (document.referrer.includes("allMovies.html")) {
      window.location.href = "allMovies.html";
    } else {
      window.location.href = "index.HTML";
    }
  };
});
