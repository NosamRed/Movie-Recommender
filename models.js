import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

const user = encodeURIComponent(process.env.MDB_USER);
const pass = encodeURIComponent(process.env.MDB_PASS);
const cluster = process.env.MDB_CLUSTER;

// Default DB used for the initial connection; models can be bound to other DBs via useDb
const dbName1 = process.env.MDB_NAME1 ?? "Users";      // primary DB (e.g., Users)
const dbName2 = process.env.MDB_NAME2 ?? "sample_mflix"; // secondary DB (e.g., sample_mflix)

export const MONGO_URI1 = `mongodb+srv://${user}:${pass}@${cluster}/${dbName1}?retryWrites=true&w=majority`;
export const MONGO_URI2 = `mongodb+srv://${user}:${pass}@${cluster}/${dbName2}?retryWrites=true&w=majority`;

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favoriteMovies: { type: [String], default: [] },
  recommendedMovies: { type: [String], default: [] }
}, { timestamps: true });

// Example schema for sample_mflix (adjust fields to match your collection)
const MovieSchema = new mongoose.Schema({
  title: String,
  year: Number,
  genres: [String]
}, { timestamps: true });

// Internal state
let connected = false;
let defaultConnection = null;
let usersConn = null;      // connection bound to dbName1 (useDb)
let sampleConn = null;     // connection bound to dbName2 (useDb)

// console.log("MONGO_URI1:", MONGO_URI1);
// console.log("MONGO_URI2:", MONGO_URI2);

// Connect to the cluster using MONGO_URI1 and prepare useDb connections.
export async function connectDB() {
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    // Modern Mongoose (v7–v9) does NOT allow useNewUrlParser or useUnifiedTopology.
    defaultConnection = await mongoose.connect(MONGO_URI1, {
      serverSelectionTimeoutMS: 5000
    });

    // Bind models to specific databases using useDb
    usersConn = mongoose.connection.useDb(dbName1, { useCache: true });
    sampleConn = mongoose.connection.useDb(dbName2, { useCache: true });

    connected = true;
    console.log("MongoDB connected to", mongoose.connection.db.databaseName);
    return mongoose.connection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

export function getModels() {
  if (!connected) {
    throw new Error("connectDB() must be called before getModels()");
  }

  const User = usersConn.models.Users || usersConn.model("Users", UserSchema, "uInfo");
  const Movie = sampleConn.models.Movie || sampleConn.model("Movie", MovieSchema, "movies");

  return { User, Movie, usersConn, sampleConn };
}

export async function findByUsername(username) {
  const { User } = getModels();
  return User.findOne({ username }).lean().exec();
}

export async function verifyUserPassword(username, candidatePassword) {
  const { User } = getModels();
  const userDoc = await User.findOne({ username }).lean().exec();
  if (!userDoc) return null;
  const matches = userDoc.password === candidatePassword;
  return matches ? { username: userDoc.username, notes: userDoc.notes ?? [] } : null;
}

/* ---------------- Favorites ---------------- */

// Some existing documents may have favoriteMovies stored as "" instead of
// an array (see the uInfo collection) — normalize to an array either way.
function normalizeFavorites(value) {
  return Array.isArray(value) ? value : [];
}

export async function getFavorites(username) {
  const { User } = getModels();
  const userDoc = await User.findOne({ username }).lean().exec();
  if (!userDoc) return null;
  return normalizeFavorites(userDoc.favoriteMovies);
}

// Adds the movieId if it isn't already favorited, removes it if it is.
// Returns { favorites, isFavorited } or null if the user doesn't exist.
export async function toggleFavorite(username, movieId) {
  const { User } = getModels();
  const userDoc = await User.findOne({ username }).exec();
  if (!userDoc) return null;

  const idStr = String(movieId);
  const favorites = normalizeFavorites(userDoc.favoriteMovies);
  const idx = favorites.indexOf(idStr);
  let isFavorited;

  if (idx === -1) {
    favorites.push(idStr);
    isFavorited = true;
  } else {
    favorites.splice(idx, 1);
    isFavorited = false;
  }

  userDoc.favoriteMovies = favorites;
  await userDoc.save();

  // Keep recommendedMovies in sync with the new favorites list. If this
  // fails (e.g. the vector index isn't ready yet), don't block the favorite
  // toggle itself — just log it and move on.
  try {
    await updateRecommendations(username);
  } catch (err) {
    console.error("updateRecommendations error (after toggleFavorite):", err);
  }

  return { favorites, isFavorited };
}

/* ---------------- Recommendations ---------------- */

const RECOMMENDATION_LIMIT = 10;
const VECTOR_INDEX_NAME = "Recommendations";
const VECTOR_NUM_CANDIDATES = 150;

// Elementwise average of one or more equal-length embedding vectors.
function averageVector(vectors) {
  if (vectors.length === 0) return null;
  const length = vectors[0].length;
  const sum = new Array(length).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < length; i++) sum[i] += vec[i];
  }

  return sum.map(v => v / vectors.length);
}

// Recomputes a user's recommendedMovies from the current contents of
// favoriteMovies: builds a single "taste" vector by averaging the plot
// embeddings of their favorited movies, runs $vectorSearch against it, and
// saves the resulting movie ids (favorited movies themselves excluded).
// Returns the recommended movie docs (title/year/poster/_id), or null if
// the user doesn't exist.
export async function updateRecommendations(username) {
  const { User, Movie } = getModels();
  const userDoc = await User.findOne({ username }).exec();
  if (!userDoc) return null;

  const favoriteIds = normalizeFavorites(userDoc.favoriteMovies)
    .filter(id => mongoose.isValidObjectId(id));

  if (favoriteIds.length === 0) {
    userDoc.recommendedMovies = [];
    await userDoc.save();
    return [];
  }

  const favoriteDocs = await Movie.find(
    { _id: { $in: favoriteIds }, plot_embedding_hf: { $exists: true, $ne: null } },
    { plot_embedding_hf: 1 }
  ).lean();

  const centroid = averageVector(favoriteDocs.map(d => d.plot_embedding_hf));

  if (!centroid) {
    // None of the favorited movies have an embedding yet — nothing to search with.
    userDoc.recommendedMovies = [];
    await userDoc.save();
    return [];
  }

  const excludeIds = favoriteIds.map(id => new mongoose.Types.ObjectId(id));

  const results = await Movie.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "plot_embedding_hf",
        queryVector: centroid,
        numCandidates: VECTOR_NUM_CANDIDATES,
        // Padded so there's still enough left after excluding favorited movies.
        limit: RECOMMENDATION_LIMIT + excludeIds.length + 10
      }
    },
    { $match: { _id: { $nin: excludeIds } } },
    { $limit: RECOMMENDATION_LIMIT },
    { $project: { title: 1, year: 1, poster: 1 } }
  ]);

  userDoc.recommendedMovies = results.map(r => String(r._id));
  await userDoc.save();

  return results;
}

export async function getRecommendedIds(username) {
  const { User } = getModels();
  const userDoc = await User.findOne({ username }).lean().exec();
  if (!userDoc) return null;
  return normalizeFavorites(userDoc.recommendedMovies);
}