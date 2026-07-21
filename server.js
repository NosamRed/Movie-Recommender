// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getModels, verifyUserPassword } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

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

      const skip = (page - 1) * size;

      const docs = await Movie.find({}, { title: 1, year: 1, poster: 1 })
        .skip(skip)
        .limit(size)
        .lean();

      const total = await Movie.countDocuments();
      const totalPages = Math.ceil(total / size);

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
