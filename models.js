import mongoose from "mongoose";
import dotenv from "dotenv";

const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true }
}, { _id: false }); // optional: prevent separate _id for each note

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  notes: { type: [NoteSchema], default: [] }
}, { timestamps: true, strict: false });

const User = mongoose.model("User", UserSchema, "Users");
export default User;

export function findByUsername(username) {
  return User.findOne({ username }).lean().exec();
}

// export async function changeNoteByTitle(username, title, content) {
//   // try to update an existing note with that title
//   const updateResult = await User.findOneAndUpdate(
//     { username, "notes.title": title },
//     { $set: { "notes.$.content": content } },
//     { new: true, lean: true }
//   ).exec();

  // if (updateResult) {
  //   return updateResult; // user document after update (lean)
  // }
  
  // no existing note with that title — push a new note
  // const pushResult = await User.findOneAndUpdate(
  //   { username },
  //   { $push: { notes: { title, content } } },
  //   { new: true, lean: true, upsert: false }
  // ).exec();

//   return pushResult;
// }

// models.js (add near other exports)

export async function verifyUserPassword(username, candidatePassword) {

  const user = await User.findOne({ username }).lean().exec();

  if (!user) return null;            // user not found
  
  const matches = user.password === candidatePassword;
  
  return matches ? { username: user.username, notes: user.notes ?? [] } : null;
}


dotenv.config();

const user = encodeURIComponent(process.env.MDB_USER ?? "NosamRed");
const pass = encodeURIComponent(process.env.MDB_PASS ?? "wMjqTl3sCqCKUSSo");
const cluster = process.env.MDB_CLUSTER ?? "cluster0.dh26syr.mongodb.net";
const dbName = process.env.MDB_NAME ?? "test";

export const MONGO_URI = `mongodb+srv://${user}:${pass}@${cluster}/${dbName}??retryWrites=true&w=majority`;

let connected = false;

export async function connectDB() {
  if (connected || mongoose.connection.readyState) {
    return mongoose.connection;
  }
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  connected = true;
  return mongoose.connection;
}
