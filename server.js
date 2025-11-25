import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import pkg from "pg";
import authRoutes from "./routes/auth.js";
import budgetRoutes from "./routes/budget_plan.js";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

dotenv.config();
const { Pool } = pkg;

// -------------------------------
// PostgreSQL Pool (Render-ready)
// -------------------------------
const db = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// -------------------------------
// Express App
// -------------------------------
const app = express();
app.use(express.json());

// -------------------------------
// CORS
// -------------------------------
app.use(cors({
  origin: "https://godfreylinzandra.github.io", // frontend
  credentials: true
}));

// -------------------------------
// Session
// -------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Attach db to req
app.use((req, res, next) => {
  req.db = db;
  next();
});

// -------------------------------
// Routes
// -------------------------------
app.use("/auth", authRoutes);
app.use("/api", budgetRoutes);

// -------------------------------
// Serve frontend static files
// -------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// SPA fallback (catch-all)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});






// -------------------------------
// Start server
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
