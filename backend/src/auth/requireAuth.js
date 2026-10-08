import { verifyToken } from "./tokens.js";

export function requireAuth(req, res, next) {
  const match = req.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  const user = match ? verifyToken(match[1]) : null;
  if (!user) return res.status(401).json({ success: false, error: "Please log in to continue." });
  req.user = user;
  next();
}
