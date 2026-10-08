import { randomUUID } from "node:crypto";
import express from "express";
import { pool } from "../database/postgres.js";
import { hashPassword, signToken, verifyPassword } from "../auth/tokens.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, error: "Enter a name, valid email, and password between 8 and 128 characters." });
  }
  try {
    const user = { id: randomUUID(), name, email };
    const passwordHash = await hashPassword(password);
    await pool.query("INSERT INTO riders(id,name,email,password_hash) VALUES($1,$2,$3,$4)", [user.id, name, email, passwordHash]);
    res.status(201).json({ success: true, user, token: signToken(user) });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, error: "An account with this email already exists." });
    req.app.get("logger")?.error(error);
    res.status(500).json({ success: false, error: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  try {
    const { rows } = await pool.query("SELECT id, name, email, password_hash FROM riders WHERE email=$1", [email]);
    const row = rows[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return res.status(401).json({ success: false, error: "Email or password is incorrect." });
    }
    const user = { id: row.id, name: row.name, email: row.email };
    res.json({ success: true, user, token: signToken(user) });
  } catch (error) {
    console.error("Rider login failed:", error);
    res.status(500).json({ success: false, error: "Could not sign in." });
  }
});

export default router;
