import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import ratelimit from "../config/upstash.js";

// In-memory fallback used whenever Upstash isn't configured, so the API is
// never left completely unprotected (the old behavior silently skipped rate
// limiting entirely when UPSTASH_* env vars were missing).
const fallbackLimiter = rateLimit({
  windowMs: 30 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.sessionId || ipKeyGenerator(req.ip),
  message: { message: "Too many requests, please try again later." },
});

// General-purpose limiter for all API traffic. Prefers the distributed Upstash
// limiter (works correctly across multiple server instances); falls back to a
// local in-memory limiter otherwise.
const rateLimiter = async (req, res, next) => {
  if (!ratelimit) {
    return fallbackLimiter(req, res, next);
  }

  try {
    // Identify the caller by session cookie (stable per browser) rather than
    // just IP, which can be shared by many users behind NAT/corporate proxies.
    const identifier = req.sessionId || req.ip;
    const { success, pending, limit, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return res.status(429).json({
        message: "Too many requests, please try again later.",
        limit: limit, // max requests limit
        remaining: pending, // remaining requests
        reset_in_seconds: reset, // time until limit resets
      });
    }
    // Request is allowed
    next();
  } catch (error) {
    console.error("Error in Rate Limiter:", error);
    next(error);
  }
};

export default rateLimiter;
