import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import "dotenv/config";

//redis tokens gotten from upstash
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const hasValidRedisConfig =
  typeof redisUrl === "string" &&
  redisUrl.startsWith("https://") &&
  typeof redisToken === "string" &&
  redisToken.length > 0;

  //rate limitting
const ratelimit = hasValidRedisConfig
  ? new Ratelimit({
      redis: new Redis({
        url: redisUrl,
        token: redisToken,
      }),
      limiter: Ratelimit.slidingWindow(10, "30 s"),
    })
  : null;

export default ratelimit;
