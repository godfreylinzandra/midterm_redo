import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import pkg from "pg";
import authRoutes from "./routes/auth.js";
import budgetRoutes from "./routes/budget_plan.js"; // router contains both budget & transactions

dotenv.config();
const { Pool } = pkg;

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// PostgreSQL Pool
const db = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

// make db accessible to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use("/auth", authRoutes);

// 🔹 Mount budget_plan router at /api so both budget and transactions paths match frontend
app.use("/api", budgetRoutes);

// Current user session
app.get("/api/session", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  try {
    const result = await db.query("SELECT id, email FROM users WHERE id=$1", [req.session.userId]);
    res.json({ userId: result.rows[0].id, email: result.rows[0].email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.json({ ok: true });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
