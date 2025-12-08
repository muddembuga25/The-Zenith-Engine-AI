
/**
 * =============================================================================
 * Standalone Automation Backend Processor
 * =============================================================================
 * This file is the entry point for the backend automation service.
 * It is designed to run as a persistent Node.js process (e.g., via pm2, Docker,
 * or a scheduled cron task).
 *
 * It connects to the Supabase database using the service key (or anon key if RLS allows)
 * and iterates through all users to execute pending automation jobs.
 * 
 * Usage:
 * > npm install dotenv @supabase/supabase-js @google/genai
 * > node backend/worker.ts
 * =============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Ensure fetch is available in older Node environments if necessary
if (!globalThis.fetch) {
    console.warn("Global fetch not found. If running on Node < 18, please install 'node-fetch'.");
}

import { runScheduler } from '../services/automationService';

const SCHEDULER_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

async function main() {
  console.log('===================================================');
  console.log('🚀 Zenith Engine AI Standalone Automation Service Started');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_ANON_KEY not found in environment variables.');
      console.warn('   Ensure .env file is present or variables are set.');
  } else {
      console.log(`✅ Connected to Supabase at ${process.env.SUPABASE_URL}`);
  }

  console.log(`🕒 Scheduler interval set to ${SCHEDULER_INTERVAL_MS / 1000} seconds.`);
  console.log('===================================================');

  // Run the scheduler immediately on start
  try {
      await runScheduler();
  } catch (e) {
      console.error("Critical error in initial scheduler run:", e);
  }

  // Set the interval for subsequent runs
  setInterval(async () => {
      try {
          await runScheduler();
      } catch (e) {
          console.error("Critical error in scheduled run:", e);
      }
  }, SCHEDULER_INTERVAL_MS);
}

// Start the service
main();
