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
  password: { type: String, required: true }
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


 //Connect to the cluster using MONGO_URI1 and prepare useDb connections.

export async function connectDB() {
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    // Connect once to the cluster using dbName1 as the default DB
    defaultConnection = await mongoose.connect(MONGO_URI1, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    // Bind models to specific databases using useDb
    // useCache: true ensures the same connection object is reused for repeated calls
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
