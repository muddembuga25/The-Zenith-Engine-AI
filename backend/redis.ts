import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

// Use REDIS_URL from env, or fallback to localhost (which may fail in prod if not configured)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Mask password for logging
const safeLogUrl = redisUrl.replace(/:[^:@]*@/, ':***@');
console.log(`[Redis] Initializing connection to ${safeLogUrl}...`);

const connection = new IORedis(redisUrl, { 
    maxRetriesPerRequest: null,
    enableOfflineQueue: false, // Fail fast so API doesn't hang waiting for Redis
    lazyConnect: true, // Don't connect immediately upon instantiation
    retryStrategy: (times) => {
        // Exponential backoff with max 5s delay
        const delay = Math.min(times * 200, 5000);
        return delay;
    }
});

// Passive error handler to prevent Node process exit on 'error' event
connection.on('error', (err) => {
    // Only log, do not throw. This allows the API server to stay alive even if Redis is down.
    console.warn('[Redis] Connection Warning:', err.message);
});

connection.on('connect', () => {
    console.log('[Redis] Connected successfully.');
});

// Attempt connection but catch initial failure
connection.connect().catch(err => {
    console.warn('[Redis] Initial connection failed (non-fatal):', err.message);
});

export default connection;