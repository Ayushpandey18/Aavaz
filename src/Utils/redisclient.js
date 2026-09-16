import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined');
}

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,

  enableReadyCheck: true,

  connectTimeout: 10_000,

  keepAlive: 10_000,

  retryStrategy(times) {
    const delay = Math.min(times * 100, 3_000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('Redis connection established');
});

redis.on('ready', () => {
  console.log('Redis connection ready');
});

redis.on('reconnecting', (delay) => {
  console.warn(`Redis reconnecting in ${delay}ms`);
});

redis.on('error', (error) => {
  console.error('Redis error:', error);
});

redis.on('close', () => {
  console.warn('Redis connection closed');
});

export const redisConnection = {
  url: redisUrl,
  maxRetriesPerRequest: null
};

export default redis;