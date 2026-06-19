import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { connectDB, getModels } from 'models.js'; // adjust path
const app = express();
app.use(express.json());

async function start() {
  await connectDB();               // MUST await
  const { User, Movie } = getModels(); // get models bound to correct DBs

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await verifyUserPassword(username, password); // or use wrapper exported from models.js
    // handle result (null/false/object) as discussed earlier
  });

  app.listen(process.env.PORT || 5500);
}

start().catch(err => { console.error(err); process.exit(1); });
