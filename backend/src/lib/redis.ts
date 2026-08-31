import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not defined in environment variables');
}

// Initialize Redis Client (supports both local Redis and Upstash Redis)
export const redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis successfully');
});
