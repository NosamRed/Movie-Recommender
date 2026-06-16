// document.addEventListener('DOMContentLoaded', function () {
//   const loginToggle = document.getElementById('login-toggle');
//   const loginForm = document.getElementById('login-form');
//   const submitLogin = document.getElementById('submit-login');

//   // Toggle login panel
//   loginToggle.addEventListener('click', function () {
//     const isHidden = loginForm.classList.toggle('hidden');
//     loginForm.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
//   });

//   // Submit handler
//   submitLogin.addEventListener('click', async function (e) {
//     e.preventDefault();

//     const username = document.getElementById('username').value.trim();
//     const password = document.getElementById('password').value;

//     if (!username || !password) {
//       alert('Please enter username and password');
//       return;
//     }

//     try {
//       const res = await fetch('/api/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ username, password }),
//         credentials: 'same-origin'
//       });

//       const data = await res.json().catch(() => ({}));

//       if (!res.ok) {
//         // server returns { error: '...' } on failure
//         alert(data.error || 'Login failed');
//         return;
//       }


//       alert('Logged in as ' + (data.user?.username || username));

//       if (data.token) {
//         try {
//           localStorage.setItem('authToken', data.token);
//         } catch (err) {
//         }
//       }

//       loginForm.classList.add('hidden');
//       loginForm.setAttribute('aria-hidden', 'true');
//     } catch (err) {
//       console.error('Login request failed', err);
//       alert('Network error. Please try again.');
//     }
//   });
// });


import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

import { connectDB, verifyUserPassword } from "models.js"; // adjust path if needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5500;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_production";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, "..", "public")));

// Login endpoint used by your client-side code
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const user = await verifyUserPassword(username, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Create a short-lived token (adjust payload and expiry as needed)
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.json({ user: { username: user.username, notes: user.notes ?? [] }, token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Fallback to index.html for SPA routes (optional)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "MovieRecommender.html"));
});

// Start server only after DB connection
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
