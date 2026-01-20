import ratelimit from "../config/upstash.js";

const rateLimiter = async (req, res, next) => {
  try {
    // Identify the user
    const identifier = req.user?.uid || req.ip;
    // limit in Upstash
    const { success, pending, limit, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return res.status(429).json({
        message: "Too many requests, please try again later.",
        limit: limit,                  // max requests limit
        remaining: pending,            // remaining requests
        reset_in_seconds: reset        // time until limit resets
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
