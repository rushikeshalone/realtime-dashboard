const { createClient } = require('redis');
require('dotenv').config();

let redisClient = null;
let publisher = null;
let subscriber = null;

let redisAvailable = false;

const redisConfig = {
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    tls: false,               // Redis Cloud doesn't need TLS on this port
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.warn('⚠️  Redis: max reconnect attempts reached — running without cache');
        return false;
      }
      return Math.min(retries * 500, 5000);
    },
  },
};

const buildClient = () => {
  const client = createClient(redisConfig);
  client.on('error', (err) => {
    if (redisAvailable) {
      console.warn('⚠️  Redis error:', err.message);
      redisAvailable = false;
    }
  });
  client.on('ready', () => {
    redisAvailable = true;
    console.log('✅ Redis connected →', process.env.REDIS_HOST);
  });
  return client;
};

const connectRedis = async () => {
  try {
    redisClient = buildClient();
    publisher  = buildClient();
    subscriber = buildClient();

    await Promise.all([
      redisClient.connect(),
      publisher.connect(),
      subscriber.connect(),
    ]);
    redisAvailable = true;
  } catch (err) {
    console.warn('⚠️  Redis unavailable — running in direct (no-cache) mode:', err.message);
    redisAvailable = false;
    redisClient = publisher = subscriber = null;
  }
};

const getCache = async (key) => {
  if (!redisAvailable || !redisClient) return null;
  try {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

const setCache = async (key, data, ttl = 10) => {
  if (!redisAvailable || !redisClient) return;
  try { await redisClient.setEx(key, ttl, JSON.stringify(data)); } catch {}
};

const publish = async (channel, data) => {
  if (!redisAvailable || !publisher) return;
  try { await publisher.publish(channel, JSON.stringify(data)); } catch {}
};

const subscribe = async (channel, callback) => {
  if (!redisAvailable || !subscriber) return;
  try {
    await subscriber.subscribe(channel, (message) => {
      try { callback(JSON.parse(message)); } catch {}
    });
  } catch {}
};

module.exports = {
  connectRedis,
  getCache,
  setCache,
  publish,
  subscribe,
  isRedisAvailable: () => redisAvailable,
};
