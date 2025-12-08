/**
 * =============================================================================
 * Standalone Automation Backend Processor
 * =============================================================================
 * This file is the entry point for the backend automation service.
 * It should be run as a continuous process on a server (e.g., using Node.js, pm2).
 *
 * How to run:
 * > node src/processor.ts
 *
 * This process is responsible for running the scheduler at a regular interval
 * to check for and execute any pending automation jobs for all users.
 * It is completely decoupled from the frontend UI.
 * =============================================================================
 */

import { runScheduler } from '../services/automationService';

const SCHEDULER_INTERVAL_MS = 60 * 1000; // 60 seconds

function main() {
  console.log('===================================================');
  console.log('🚀 Zenith Engine AI Standalone Automation Service Started');
  console.log(`🕒 Checking for jobs every ${SCHEDULER_INTERVAL_MS / 1000} seconds.`);
  console.log('===================================================');

  // Run the scheduler immediately on start, then set the interval.
  runScheduler();
  setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
}

// Start the service
main();