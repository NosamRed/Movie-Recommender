const FAVORITES_API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://movie-recommender-d2xa.onrender.com";

const FAVORITES_STORAGE_KEY = "mr_username"; // same key mrScript.js uses

let favoriteIds = new Set();

function getCurrentUsername() {
  try {
    return localStorage.getItem(FAVORITES_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

// Call once per page, before rendering any cards, so star state is correct
// from the start.
async function loadFavorites() {
  const username = getCurrentUsername();
  if (!username) {
    favoriteIds = new Set();
    return favoriteIds;
  }

  try {
    const resp = await fetch(`${FAVORITES_API_BASE}/api/favorites/${encodeURIComponent(username)}`);
    if (!resp.ok) throw new Error("Failed to load favorites");
    const data = await resp.json();
    favoriteIds = new Set((data.favorites || []).map(String));
  } catch (err) {
    console.error("loadFavorites error:", err);
    favoriteIds = new Set();
  }

  return favoriteIds;
}

async function toggleFavoriteMovie(movieId) {
  const username = getCurrentUsername();
  if (!username) {
    // Not logged in — send them to log in rather than silently failing.
    window.location.href = "login.html";
    return null;
  }

  try {
    const resp = await fetch(`${FAVORITES_API_BASE}/api/favorites/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, movieId: String(movieId) })
    });
    if (!resp.ok) throw new Error("Failed to update favorite");

    const data = await resp.json();
    if (data.isFavorited) {
      favoriteIds.add(String(movieId));
    } else {
      favoriteIds.delete(String(movieId));
    }
    return data.isFavorited;
  } catch (err) {
    console.error("toggleFavoriteMovie error:", err);
    return null;
  }
}

const STAR_SVG = `<svg viewBox="0 0 24 24" class="star-icon" aria-hidden="true">
  <path d="M12 2.5l2.98 6.04 6.67.97-4.83 4.7 1.14 6.65L12 17.77l-5.96 3.13 1.14-6.65-4.83-4.7 6.67-.97z"/>
</svg>`;

// Creates the star <button> for a movie card. Appends itself to `card`
// (card must have position: relative for the top-right placement to work).
function addFavoriteStar(card, movieId) {
  const btn = document.createElement("button");
  const favorited = favoriteIds.has(String(movieId));

  btn.type = "button";
  btn.className = "favorite-star" + (favorited ? " favorited" : "");
  btn.setAttribute("aria-label", favorited ? "Remove from favorites" : "Add to favorites");
  btn.setAttribute("aria-pressed", favorited ? "true" : "false");
  btn.innerHTML = STAR_SVG;

  btn.onclick = async (e) => {
    e.stopPropagation(); // don't trigger the card's own click (navigation)
    btn.disabled = true;

    const result = await toggleFavoriteMovie(movieId);

    btn.disabled = false;
    if (result === null) return; // not logged in, or the request failed

    btn.classList.toggle("favorited", result);
    btn.setAttribute("aria-pressed", result ? "true" : "false");
    btn.setAttribute("aria-label", result ? "Remove from favorites" : "Add to favorites");
  };

  card.appendChild(btn);
  return btn;
}