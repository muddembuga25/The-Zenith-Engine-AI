
import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(redisUrl, { 
    maxRetriesPerRequest: null 
});

console.log(`[Redis] Connecting to ${redisUrl}...`);

export default connection;
