const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

const value = id => document.getElementById(id).value.trim();

function setMessage(text, kind) {
  const el = document.getElementById("formMessage");
  el.textContent = text;
  el.className = "form-message" + (kind === "ok" ? " ok" : "");
}

/* ---------------- poster preview ---------------- */

function updatePosterPreview() {
  const preview = document.getElementById("posterPreview");
  const url = value("poster");
  preview.textContent = "";

  const showMissing = () => {
    preview.textContent = "";
    const box = document.createElement("div");
    box.className = "movie-detail-poster poster-missing";
    box.textContent = "No poster available";
    preview.appendChild(box);
  };

  if (!/^https?:\/\//i.test(url)) {
    showMissing();
    return;
  }

  const img = document.createElement("img");
  img.className = "movie-detail-poster";
  img.alt = "Poster preview";
  img.onerror = showMissing;
  img.src = url;
  preview.appendChild(img);
}

/* ---------------- submit ---------------- */

// Raw (trimmed) strings only — the server turns blanks into "N/A" and
// validates/converts everything else.
function collectMovie() {
  return {
    title: value("title"),
    year: value("year"),
    released: value("released"),
    rated: value("rated"),
    runtime: value("runtime"),
    poster: value("poster"),
    plot: value("plot"),
    genres: value("genres"),
    cast: value("cast"),
    directors: value("directors"),
    writers: value("writers"),
    languages: value("languages"),
    countries: value("countries"),
    awards: {
      wins: value("awardsWins"),
      nominations: value("awardsNominations"),
      text: value("awardsText")
    },
    imdb: {
      rating: value("imdbRating"),
      votes: value("imdbVotes")
    },
    tomatoes: {
      viewer: {
        rating: value("viewerRating"),
        numReviews: value("viewerReviews"),
        meter: value("viewerMeter")
      },
      critic: {
        rating: value("criticRating"),
        numReviews: value("criticReviews"),
        meter: value("criticMeter")
      }
    }
  };
}

async function submitMovie(e) {
  e.preventDefault();

  const username = getCurrentUsername(); // favorites.js
  if (!username) {
    window.location.href = "login.html";
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  setMessage("Saving...");

  try {
    const resp = await fetch(`${API_BASE}/api/added-movies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, movie: collectMovie() })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || `Request failed (${resp.status})`);

    setMessage("Movie added!", "ok");
    window.location.href = "addedMovies.html";
  } catch (err) {
    console.error("submitMovie error:", err);
    setMessage(err.message);
    submitBtn.disabled = false;
  }
}

/* ---------------- init ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  if (!getCurrentUsername()) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("movieForm").addEventListener("submit", submitMovie);
  document.getElementById("poster").addEventListener("change", updatePosterPreview);

  document.getElementById("backBtn").onclick = () => {
    window.location.href = "addedMovies.html";
  };
});