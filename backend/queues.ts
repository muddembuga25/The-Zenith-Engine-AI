
import { Queue } from 'bullmq';
import connection from './redis';

// Queue for text-heavy, high-priority CMS tasks (Blog posts)
export const cmsQueue = new Queue('cms-queue', { connection });

// Queue for slow, resource-intensive media tasks (Image/Video generation)
export const mediaQueue = new Queue('media-queue', { connection });

// Queue for external communications (Email campaigns)
export const emailQueue = new Queue('email-queue', { connection });

// Queue for real-time or time-sensitive checks (Live monitoring)
export const monitoringQueue = new Queue('monitoring-queue', { connection });
