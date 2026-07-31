import crypto from "crypto";

const SESSION_COOKIE = "rc_sid";
const SESSION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

// Falls back to a random per-boot secret so local dev works without setup,
// but that means cookies signed before a restart stop validating - set
// COOKIE_SECRET in any environment that needs sessions to survive restarts.
if (!process.env.COOKIE_SECRET) {
  console.warn(
    "COOKIE_SECRET is not set. Using a random secret generated for this process only - " +
      "sessions will not survive a restart. Set COOKIE_SECRET in backend/.env for production."
  );
}
export const COOKIE_SECRET = process.env.COOKIE_SECRET || crypto.randomBytes(32).toString("hex");

// Anonymous session identity: replaces the old client-supplied "user_id" field.
// Every request gets a signed, httpOnly cookie identifying "this browser" - resume
// ownership is checked against this value, never against anything the client sends.
export default function session(req, res, next) {
  const existing = req.signedCookies?.[SESSION_COOKIE];

  if (existing) {
    req.sessionId = existing;
    return next();
  }

  const sessionId = crypto.randomUUID();
  req.sessionId = sessionId;
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    signed: true,
    sameSite: isProduction ? "none" : "lax", // "none" is required for cross-origin cookies, but only works over HTTPS
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_MS,
  });

  next();
}
