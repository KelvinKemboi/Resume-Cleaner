import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import "dotenv/config";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),            
  limiter: Ratelimit.slidingWindow(10, "30 s") // 10 requests per 30 seconds
});

export default ratelimit;
