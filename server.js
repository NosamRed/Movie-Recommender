// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { connectDB, getModels, verifyUserPassword, getFavorites, toggleFavorite, getRecommendedIds, updateRecommendations } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// So a search term like "Se7en" or "(500) Days" is matched literally,
// not interpreted as a regex pattern.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function start() {
  await connectDB();
  const { User, Movie } = getModels();

  // Compact list (used by main page)
  app.get('/api/movies', async (req, res) => {
    try {
      const rawLimit = parseInt(req.query.limit || '200', 10);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 2000) : 200;

      const allowed = new Set(['_id', 'title', 'year', 'rating', 'poster', 'genres', 'plot']);
      const requested = (req.query.fields || 'title').split(',').map(f => f.trim()).filter(Boolean);
      const projection = {};

      requested.forEach(f => {
        if (allowed.has(f)) projection[f] = 1;
      });

      if (!projection._id) projection._id = 1;

      const docs = await Movie.find({}, projection).sort({ title: 1 }).limit(limit).lean().exec();
      return res.json(docs);
    } catch (err) {
      console.error('GET /api/movies error:', err);
      return res.status(500).json({ error: 'Failed to fetch movies' });
    }
  });

  // Paged list (used by allMovies.html)
  app.get("/api/movies/paged", async (req, res) => {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const size = parseInt(req.query.size || "150", 10); // 30 rows × 5 columns
      const search = (req.query.search || "").trim();

      // Case-insensitive substring match on title. Escaped so characters like
      // "." or "(" in a search term are treated literally, not as regex syntax.
      const filter = search
        ? { title: { $regex: escapeRegex(search), $options: "i" } }
        : {};

      const skip = (page - 1) * size;

      // sample_mflix has multiple documents for some movies (same title/year,
      // different _id) — group them down to one representative per movie
      // before paging, so duplicates don't show up in the grid.
      const basePipeline = [
        { $match: filter },
        { $sort: { _id: 1 } }, // deterministic pick when grouping
        {
          $group: {
            _id: { title: "$title", year: "$year" },
            doc: { $first: "$$ROOT" }
          }
        },
        { $replaceRoot: { newRoot: "$doc" } }
      ];

      const docs = await Movie.aggregate([
        ...basePipeline,
        { $sort: { year: 1, title: 1 } }, // by release year; title breaks ties within a year
        { $skip: skip },
        { $limit: size },
        { $project: { title: 1, year: 1, poster: 1 } }
      ]);

      const countResult = await Movie.aggregate([...basePipeline, { $count: "total" }]);
      const total = countResult[0]?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / size));

      res.json({
        page,
        size,
        total,
        totalPages,
        movies: docs
      });
    } catch (err) {
      console.error("GET /api/movies/paged error:", err);
      res.status(500).json({ error: "Failed to fetch paged movies" });
    }
  });

  // Single movie details (for movie.html)
  app.get("/api/movie/:id", async (req, res) => {
    try {
      const id = req.params.id;

      const movie = await Movie.findById(id, {
        plot_embedding_hf: 0 // exclude vector
      }).lean();

      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }

      res.json(movie);
    } catch (err) {
      console.error("GET /api/movie/:id error:", err);
      res.status(500).json({ error: "Failed to fetch movie" });
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await verifyUserPassword(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      return res.json({ username: user.username || username });
    } catch (err) {
      console.error('POST /api/login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get a user's favorite movie ids
  app.get('/api/favorites/:username', async (req, res) => {
    try {
      const favorites = await getFavorites(req.params.username);
      if (favorites === null) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ favorites });
    } catch (err) {
      console.error('GET /api/favorites/:username error:', err);
      return res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  // Full movie details (title/year/poster) for everything a user has favorited —
  // used by favoriteMovies.html to render the grid.
  app.get('/api/favorites/:username/movies', async (req, res) => {
    try {
      const favorites = await getFavorites(req.params.username);
      if (favorites === null) {
        return res.status(404).json({ error: 'User not found' });
      }

      const ids = favorites.filter(id => mongoose.isValidObjectId(id));
      if (ids.length === 0) {
        return res.json({ movies: [] });
      }

      const docs = await Movie.find(
        { _id: { $in: ids } },
        { title: 1, year: 1, poster: 1 }
      ).lean();

      return res.json({ movies: docs });
    } catch (err) {
      console.error('GET /api/favorites/:username/movies error:', err);
      return res.status(500).json({ error: 'Failed to fetch favorite movies' });
    }
  });

  // Add or remove a movie from a user's favorites
  app.post('/api/favorites/toggle', async (req, res) => {
    try {
      const { username, movieId } = req.body;
      if (!username || !movieId) {
        return res.status(400).json({ error: 'username and movieId required' });
      }

      const result = await toggleFavorite(username, movieId);
      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json(result);
    } catch (err) {
      console.error('POST /api/favorites/toggle error:', err);
      return res.status(500).json({ error: 'Failed to update favorites' });
    }
  });

  // Full movie details (title/year/poster) for a user's current recommendedMovies —
  // used by the homepage's "Recommended For You" section.
  app.get('/api/recommendations/:username', async (req, res) => {
    try {
      const ids = await getRecommendedIds(req.params.username);
      if (ids === null) {
        return res.status(404).json({ error: 'User not found' });
      }

      const objectIds = ids.filter(id => mongoose.isValidObjectId(id));
      if (objectIds.length === 0) {
        return res.json({ movies: [] });
      }

      const docs = await Movie.find(
        { _id: { $in: objectIds } },
        { title: 1, year: 1, poster: 1 }
      ).lean();

      return res.json({ movies: docs });
    } catch (err) {
      console.error('GET /api/recommendations/:username error:', err);
      return res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  // Manually recompute recommendations (recommendedMovies is normally kept in
  // sync automatically whenever favorites change — this is mainly for testing,
  // or for re-running after the vector index itself changes).
  app.post('/api/recommendations/:username/refresh', async (req, res) => {
    try {
      const movies = await updateRecommendations(req.params.username);
      if (movies === null) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ movies });
    } catch (err) {
      console.error('POST /api/recommendations/:username/refresh error:', err);
      return res.status(500).json({ error: 'Failed to refresh recommendations' });
    }
  });

  // Static files
  app.use(express.static(__dirname));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.HTML"));
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});