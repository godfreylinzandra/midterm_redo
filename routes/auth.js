import express from "express";
import bcrypt from "bcryptjs";

const router = express.Router();

// ----- REGISTER -----
router.post("/register", async (req, res) => {
  const { name, email, password, address } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const check = await req.db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (check.rows.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await req.db.query(
      `INSERT INTO users(name, email, password, address)
       VALUES($1,$2,$3,$4) RETURNING id, name, email, address`,
      [name, email, hashedPassword, address || null]
    );

    req.session.userId = result.rows[0].id;

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----- LOGIN -----
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email & password required" });

  try {
    // Temporary debug logs — remove or lower in production
    console.log('[AUTH] /login called — Origin:', req.get('origin'));
    console.log('[AUTH] body:', { email: req.body.email ? '***REDACTED***' : null });

    const result = await req.db.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    console.log('[AUTH] user found:', !!user);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    console.log('[AUTH] password match:', match);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    req.session.userId = user.id;
    console.log('[AUTH] session set for user id:', user.id);
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----- LOGOUT -----
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.json({ ok: true });
  });
});

// ----- CURRENT USER -----
router.get("/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  try {
    const result = await req.db.query(
      "SELECT id, name, email FROM users WHERE id=$1",
      [req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
