import Redis from 'ioredis';

const redis = new Redis({
  path: '/tmp/redis/redis.sock'
});

redis.on('connect', () => console.log('Connected to Redis via Unix socket'));
redis.on('error', (err) => console.error('Redis error:', err));

export default redis;
