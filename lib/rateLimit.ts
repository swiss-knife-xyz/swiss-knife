import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const cache = new Map();

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */
  prefix: "@upstash/ratelimit",
  ephemeralCache: cache,
});

// // Use a constant string to limit all requests with a single ratelimit
// // Or use a userID, apiKey or ip address for individual limits.
// const identifier = "api";
// const { success } = await ratelimit.limit(identifier);

// if (!success) {
//   return "Unable to process at this time";
// }
// doExpensiveCalculation();
// return "Here you go!";
