
import React, { useEffect, useRef } from 'react';
import { runScheduler } from '../services/automationService';
import { useToast } from '../hooks/useToast';

const WORKER_INTERVAL_MS = 30 * 1000; // Run every 30 seconds

export const SimulationWorker: React.FC = () => {
    const timerRef = useRef<number | null>(null);
    const isRunningRef = useRef(false);
    const { addToast } = useToast();

    useEffect(() => {
        const executeWorker = async () => {
            if (isRunningRef.current) return;
            
            isRunningRef.current = true;
            try {
                // Check if we are online/active
                if (document.visibilityState === 'visible') {
                    console.debug('[SimulationWorker] Tick: Running scheduler...');
                    await runScheduler();
                }
            } catch (e: any) {
                console.error('[SimulationWorker] Scheduler failed:', e);
                // Optional: addToast(`Automation Worker Error: ${e.message}`, 'error');
            } finally {
                isRunningRef.current = false;
            }
        };

        // Run immediately on mount
        executeWorker();

        // Set interval
        timerRef.current = window.setInterval(executeWorker, WORKER_INTERVAL_MS);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    return null; // This component renders nothing
};
