import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../Utils/redisclient.js';

const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,                  // max 100 requests per window per IP
  keyGenerator: ipKeyGenerator, // IPv6-safe
  message: 'Too many requests, please try again later.',
});

export default apiLimiter;
