import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// rate limiter - always active locally regardless of whether Upstash is configured.
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.sessionId || ipKeyGenerator(req.ip),
  message: { message: "Too many upload/clean requests. Please wait a few minutes and try again." },
});

export default strictLimiter;
