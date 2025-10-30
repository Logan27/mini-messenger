import Redis from 'ioredis';

import { config } from './index.js';

let redisClient = null;
let redisSubscriber = null;

export const initializeRedis = async () => {
  try {
    // Main Redis client for operations
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      family: config.redis.family,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    });

    // Subscriber client for pub/sub
    redisSubscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      family: config.redis.family,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    });

    // Connect both clients - ioredis doesn't require explicit connect()
    await Promise.all([redisClient.ping(), redisSubscriber.ping()]);

    console.log('✅ Redis connection established successfully');

    // Error handling
    redisClient.on('error', error => {
      console.error('❌ Redis client error:', error);
    });

    redisSubscriber.on('error', error => {
      console.error('❌ Redis subscriber error:', error);
    });

    return { redisClient, redisSubscriber };
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
};

export const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('🔒 Redis client connection closed');
    }

    if (redisSubscriber) {
      await redisSubscriber.quit();
      console.log('🔒 Redis subscriber connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing Redis connections:', error);
  }
};

// Add ping method for health checks
export const pingRedis = async () => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    const result = await redisClient.ping();
    return result;
  } catch (error) {
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

export const getRedisSubscriber = () => {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not initialized. Call initializeRedis() first.');
  }
  return redisSubscriber;
};

export { redisClient };
export default redisClient;
