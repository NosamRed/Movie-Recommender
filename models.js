import dotenv from "dotenv";
dotenv.config(); // MUST run before reading process.env

import mongoose from "mongoose";

// const NoteSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   content: { type: String, required: true }
// }, { _id: false });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

export const User = mongoose.model("Users", UserSchema, "uInfo");

export function findByUsername(username) {
  return User.findOne({ username }).lean().exec();
}

export async function verifyUserPassword(username, candidatePassword) {
  const user = await User.findOne({ username }).lean().exec();
  if (!user) return null;
  const matches = user.password === candidatePassword;
  return matches ? { username: user.username, notes: user.notes ?? [] } : null;
}

// connection logic
const user = encodeURIComponent(process.env.MDB_USER ?? "NosamRed");
const pass = encodeURIComponent(process.env.MDB_PASS ?? "wMjqTl3sCqCKUSSo");
const cluster = process.env.MDB_CLUSTER ?? "cluster0.dh26syr.mongodb.net";
const dbName = process.env.MDB_NAME ?? "test";

// NOTE: single ? before query params for SRV URIs
export const MONGO_URI = `mongodb+srv://${user}:${pass}@${cluster}/${dbName}?retryWrites=true&w=majority`;

let connected = false;

export async function connectDB() {
  if (connected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // surface network/auth errors quickly
    });
    connected = true;
    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err; // rethrow so caller can handle or exit
  }
}
