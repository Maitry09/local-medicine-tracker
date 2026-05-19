import NodeCache from 'node-cache';
import Redis from 'ioredis';

const TTL = parseInt(process.env.CACHE_TTL || '300', 10); // default 5 minutes

let client = null;
let mode = 'memory';

if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL);
  mode = 'redis';
}

const memoryCache = new NodeCache({ stdTTL: TTL, checkperiod: 120 });

export async function get(key) {
  if (mode === 'redis') {
    const v = await client.get(key);
    return v ? JSON.parse(v) : null;
  }
  return memoryCache.get(key) || null;
}

export async function set(key, value, ttl = TTL) {
  if (mode === 'redis') {
    await client.set(key, JSON.stringify(value), 'EX', ttl);
    return;
  }
  memoryCache.set(key, value, ttl);
}

export async function del(key) {
  if (mode === 'redis') {
    await client.del(key);
    return;
  }
  memoryCache.del(key);
}

export async function delPrefix(prefix) {
  if (mode === 'redis') {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length) await client.del(...keys);
    return;
  }
  const keys = memoryCache.keys().filter(k => k.startsWith(prefix));
  if (keys.length) memoryCache.del(keys);
}

export default {
  get, set, del, delPrefix
};
