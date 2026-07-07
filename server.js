// server.js
import dotenv from 'dotenv';
dotenv.config();

// console.log("Loaded cluster:", process.env.MDB_CLUSTER);
// console.log("MDB_USER:", process.env.MDB_USER);
// console.log("MDB_PASS:", process.env.MDB_PASS);
// console.log("MDB_CLUSTER:", process.env.MDB_CLUSTER);
// console.log("MDB_NAME1:", process.env.MDB_NAME1);
// console.log("MDB_NAME2:", process.env.MDB_NAME2);

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getModels, verifyUserPassword } from './models.js'; // adjust path if needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Optional: enable CORS for local development or specific origins
// Adjust origin as needed or remove if serving frontend from same origin
app.use(cors({ origin: true }));

async function start() {
  // Ensure DB is connected before registering routes that use models
  await connectDB();               // MUST await
  const { User, Movie } = getModels(); // get models bound to correct DBs

  /**
   * GET /api/movies
   * Returns a compact list of movies.
   * Query params:
   *   limit  - max number of docs to return (default 200, max 2000)
   *   fields - comma-separated list of allowed fields (e.g. "title,year,rating,poster")
   *
   * By default this returns documents projected to safe fields (title + _id).
   * It intentionally avoids returning large/sensitive fields (e.g., embedding vectors).
   */
  app.get('/api/movies', async (req, res) => {
    try {
      // parse and sanitize limit
      const rawLimit = parseInt(req.query.limit || '200', 10);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 2000) : 200;

      // allowed fields to project
      const allowed = new Set(['_id', 'title', 'year', 'rating', 'poster', 'genres', 'plot']);
      const requested = (req.query.fields || 'title').split(',').map(f => f.trim()).filter(Boolean);
      const projection = {};

      requested.forEach(f => {
        if (allowed.has(f)) projection[f] = 1;
      });

      // always include _id so client can use it
      if (!projection._id) projection._id = 1;

      // Build query (extendable for search filters)
      const query = {}; // add filters here if you want ?q=... support

      const docs = await Movie.find(query, projection).sort({ title: 1 }).limit(limit).lean().exec();

      return res.json(docs);
    } catch (err) {
      console.error('GET /api/movies error:', err);
      return res.status(500).json({ error: 'Failed to fetch movies' });
    }
  });

  /**
   * POST /api/login
   * Minimal example: verify username/password using verifyUserPassword from models.js
   * Expected request body: { username, password }
   * Response: { success: true, username } on success, or 401 with { error } on failure
   */
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // verifyUserPassword should return user info on success or null/false on failure
      const user = await verifyUserPassword(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Minimal response; in production you would issue a session or JWT
      return res.json({ username: user.username || username });
    } catch (err) {
      console.error('POST /api/login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  // Serve static frontend files if you keep them in a "public" folder
  // Adjust the folder name/path to match your project layout
  app.use(express.static(path.join(__dirname, 'public')));

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
