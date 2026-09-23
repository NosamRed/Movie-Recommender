const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

// Fields that are shown in dedicated spots below. Anything NOT in this set
// (and not the embedding) gets shown in the "Other fields" section, so
// nothing in the document is silently dropped.
const HANDLED_FIELDS = new Set([
  "_id", "id", "title", "year", "released", "rated", "runtime", "type",
  "poster", "plot", "fullplot", "genres", "cast", "directors", "writers",
  "languages", "countries", "awards", "imdb", "tomatoes",
  "num_mflix_comments", "lastupdated", "plot_embedding_hf"
]);

/* ---------------- helpers ---------------- */

function getMovieId() {
  return new URLSearchParams(window.location.search).get("id");
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return esc(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
  });
}

function isEmpty(v) {
  return v === undefined || v === null || v === "" ||
    (Array.isArray(v) && v.length === 0);
}

function humanizeKey(key) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, c => c.toUpperCase());
}

// Renders any value (string, number, date string, array, nested object) as HTML
function renderValue(value) {
  if (isEmpty(value)) return `<span class="muted">N/A</span>`;

  if (Array.isArray(value)) {
    return value.map(v => renderValue(v)).join(", ");
  }

  if (typeof value === "object") {
    return renderPairs(value);
  }

  if (typeof value === "string" && ISO_DATE.test(value)) {
    return formatDate(value);
  }

  return esc(value);
}

// Renders an object as a list of label / value rows
function renderPairs(obj) {
  const rows = Object.entries(obj)
    .filter(([, v]) => !isEmpty(v))
    .map(([k, v]) => `
      <div class="kv-row">
        <dt>${esc(humanizeKey(k))}</dt>
        <dd>${renderValue(v)}</dd>
      </div>`)
    .join("");

  return rows ? `<dl class="kv">${rows}</dl>` : `<span class="muted">N/A</span>`;
}

function section(title, bodyHtml) {
  return `
    <section class="detail-section">
      <h2>${esc(title)}</h2>
      ${bodyHtml}
    </section>`;
}

function textSection(title, value) {
  return section(title, `<p>${renderValue(value)}</p>`);
}

/* ---------------- data loading ---------------- */

async function loadMovie() {
  const container = document.getElementById("movie-details");
  const id = getMovieId();

  if (!id) {
    container.innerHTML = `<p class="error">No movie id was provided.</p>`;
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/movie/${encodeURIComponent(id)}`);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error || "Could not load this movie.");
    }
    renderMovie(await resp.json());
  } catch (err) {
    console.error("loadMovie error:", err);
    container.innerHTML = `<p class="error">${esc(err.message)}</p>`;
  }
}

/* ---------------- rendering ---------------- */

function renderMovie(movie) {
  const container = document.getElementById("movie-details");

  const posterHtml = movie.poster
    ? `<img src="${esc(movie.poster)}" alt="${esc(movie.title)} poster"
            class="movie-detail-poster"
            onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'movie-detail-poster poster-missing',textContent:'No poster available'}))">`
    : `<div class="movie-detail-poster poster-missing">No poster available</div>`;

  // Quick facts shown beside the poster
  const facts = {
    Year: movie.year,
    Released: movie.released,
    Rated: movie.rated,
    Runtime: movie.runtime ? `${movie.runtime} minutes` : null,
    Type: movie.type
  };
  const factsHtml = Object.entries(facts)
    .map(([label, val]) => `
      <div class="kv-row">
        <dt>${label}</dt>
        <dd>${renderValue(val)}</dd>
      </div>`)
    .join("");

  // Anything in the document we haven't given its own spot
  const extras = {};
  Object.keys(movie).forEach(k => {
    if (!HANDLED_FIELDS.has(k)) extras[k] = movie[k];
  });

  const plotsDiffer = movie.plot && movie.fullplot && movie.plot !== movie.fullplot;

  container.innerHTML = `
    <div class="movie-header">
      ${posterHtml}
      <div class="movie-header-info">
        <h1>${esc(movie.title)}</h1>
        <dl class="kv">${factsHtml}</dl>
      </div>
    </div>

    ${section("Plot", `<p>${esc(movie.fullplot || movie.plot || "No plot available.")}</p>`)}
    ${plotsDiffer ? section("Plot summary", `<p>${esc(movie.plot)}</p>`) : ""}

    ${textSection("Genres", movie.genres)}
    ${textSection("Cast", movie.cast)}
    ${textSection("Directors", movie.directors)}
    ${textSection("Writers", movie.writers)}
    ${textSection("Languages", movie.languages)}
    ${textSection("Countries", movie.countries)}

    ${section("Awards", renderPairs(movie.awards || {}))}
    ${section("IMDb", renderPairs(movie.imdb || {}))}
    ${section("Rotten Tomatoes", renderPairs(movie.tomatoes || {}))}

    ${section("Database info", renderPairs({
      "Comments": movie.num_mflix_comments,
      "Last updated": movie.lastupdated,
      "Document ID": movie._id,
      "Dataset ID": movie.id
    }))}

    ${Object.keys(extras).length ? section("Other fields", renderPairs(extras)) : ""}
  `;

  document.title = `${movie.title} - Movie Recommender`;
}

/* ---------------- init ---------------- */

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