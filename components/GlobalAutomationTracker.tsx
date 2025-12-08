
import React, { useEffect, useState } from 'react';
import type { Site } from '../types';
import { AppStatus } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon, XIcon, LightbulbIcon, PenIcon, PhotoIcon, ArrowUpTrayIcon, ShareIcon, Cog6ToothIcon } from './Icons';

export interface AutomationJob {
  jobId: string;
  siteId: string;
  topic: string;
  status: AppStatus;
  statusMessage: string;
  error?: string;
}

const JOB_TRACKER_KEY = 'zenith-engine-ai-running-jobs';

const stepIcons: { [key: string]: React.FC<any> } = {
    Strategy: LightbulbIcon,
    Writing: PenIcon,
    Image: PhotoIcon,
    SEO: Cog6ToothIcon,
    Publish: ArrowUpTrayIcon,
    Social: ShareIcon,
    Complete: CheckCircleIcon,
};

const AutomationProcessVisualizer: React.FC<{ job: AutomationJob; siteName: string; onClose: () => void; }> = ({ job, siteName, onClose }) => {
    const [isFadingOut, setIsFadingOut] = useState(false);

    const steps = [
        { status: AppStatus.GENERATING_STRATEGY, label: 'Strategy' },
        { status: AppStatus.GENERATING_ARTICLE, label: 'Writing' },
        { status: AppStatus.GENERATING_IMAGE, label: 'Image' },
        { status: AppStatus.READY_TO_PUBLISH, label: 'SEO' }, 
        { status: AppStatus.PUBLISHING, label: 'Publish' },
        { status: AppStatus.GENERATING_SOCIAL_POSTS, label: 'Social' },
        { status: AppStatus.PUBLISHED, label: 'Complete' },
    ];

    const currentStepIndex = steps.findIndex(step => job.status <= step.status && job.status !== AppStatus.PUBLISHED && job.status !== AppStatus.READY_TO_PUBLISH);
    
    // A more robust way to find the active step
    let activeStepIndex = -1;
    if (job.status === AppStatus.PUBLISHED) {
        activeStepIndex = steps.length;
    } else if (job.status === AppStatus.ERROR) {
        // Find the last non-error status to highlight the failing step
        // This logic is tricky, let's find the first step that *is not* completed
        const firstPendingIndex = steps.findIndex(step => job.status < step.status);
        activeStepIndex = firstPendingIndex > -1 ? firstPendingIndex : steps.length - 1;
    } else {
        // Find the index of the current status
        const matchingStepIndex = steps.findIndex(step => step.status === job.status);
        activeStepIndex = matchingStepIndex > -1 ? matchingStepIndex : 0;
    }

    const isError = job.status === AppStatus.ERROR;
    const isComplete = job.status === AppStatus.PUBLISHED;

    useEffect(() => {
        if (isComplete) {
            const timer = setTimeout(() => {
                setIsFadingOut(true);
                setTimeout(onClose, 500); // Wait for fade out to finish
            }, 5000); // 5 seconds before auto-closing
            return () => clearTimeout(timer);
        }
    }, [isComplete, onClose]);

    const handleClose = () => {
        setIsFadingOut(true);
        setTimeout(onClose, 500);
    };

    return (
        <div className={`w-full max-w-4xl mx-auto bg-panel-light/80 backdrop-blur-md rounded-xl shadow-2xl shadow-black/50 border animate-fade-in-up transition-all duration-500 ${isFadingOut ? 'opacity-0 translate-y-4' : ''} ${isError ? 'border-red-500/50' : isComplete ? 'border-green-500/50' : 'border-border'}`}>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-white text-base">
                            Automation running for <span className="text-blue-400">{siteName}</span>
                        </p>
                        <p className="text-sm text-text-secondary truncate mt-1">Topic: {job.topic}</p>
                    </div>
                    <button onClick={handleClose} className="p-1 text-gray-500 hover:text-white rounded-full transition-colors">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const isActive = index === activeStepIndex && !isError && !isComplete;
                            const isDone = index < activeStepIndex || isComplete;
                            const isFailed = index === activeStepIndex && isError;

                            let color = 'text-gray-500';
                            let Icon = stepIcons[step.label];
                            if (isActive) color = 'text-blue-400 animate-pulse';
                            if (isDone) color = 'text-green-400';
                            if (isFailed) {
                                color = 'text-red-400';
                                Icon = ExclamationTriangleIcon;
                            }
                            
                            return (
                                <React.Fragment key={step.label}>
                                    <div className="flex flex-col items-center text-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-blue-500/50 bg-blue-900/30' : isDone ? 'border-green-500/50 bg-green-900/30' : isFailed ? 'border-red-500/50 bg-red-900/30' : 'border-gray-700 bg-panel-light'}`}>
                                            {isActive ? <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Icon className={`h-5 w-5 ${color}`} />}
                                        </div>
                                        <p className={`text-xs mt-1.5 font-medium ${color}`}>{step.label}</p>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`flex-grow h-0.5 mx-2 rounded-full ${isDone || index < activeStepIndex ? 'bg-green-500/50' : 'bg-gray-700'}`}></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className={`text-sm font-medium ${isError ? 'text-red-300' : 'text-text-secondary'}`}>
                        {isError ? `Error: ${job.error}` : isComplete ? 'Automation finished successfully!' : job.statusMessage}
                    </p>
                </div>
            </div>
        </div>
    );
};


export const GlobalAutomationTracker: React.FC<{ 
    isOpen: boolean;
    onClose: () => void;
    sites: Site[]; 
    onActiveJobsChange?: (hasJobs: boolean) => void;
}> = ({ isOpen, onClose, sites, onActiveJobsChange }) => {
    const [jobs, setJobs] = useState<AutomationJob[]>([]);

    useEffect(() => {
        const checkJobs = () => {
            try {
                const jobsJSON = localStorage.getItem(JOB_TRACKER_KEY);
                const currentJobs = jobsJSON ? JSON.parse(jobsJSON) : [];
                setJobs(currentJobs);

                // Notify parent if job status changed
                if (onActiveJobsChange) {
                    onActiveJobsChange(currentJobs.length > 0);
                }

                const indicator = document.getElementById('job-tracker-indicator');
                if (indicator) {
                    indicator.style.backgroundColor = currentJobs.length > 0 ? '#3b82f6' : 'transparent';
                    if (currentJobs.length > 0) {
                        indicator.classList.add('animate-pulse');
                    } else {
                        indicator.classList.remove('animate-pulse');
                    }
                }
            } catch (e) {
                console.error("Failed to parse job tracker data from localStorage", e);
            }
        };

        // Initial check
        checkJobs();
        
        // Polling for updates
        const interval = setInterval(checkJobs, 1000);

        return () => clearInterval(interval);
    }, [onActiveJobsChange]);
    
    const handleClearJob = (jobId: string) => {
         const updatedJobs = jobs.filter(j => j.jobId !== jobId);
         setJobs(updatedJobs);
         localStorage.setItem(JOB_TRACKER_KEY, JSON.stringify(updatedJobs));
         if (onActiveJobsChange) {
             onActiveJobsChange(updatedJobs.length > 0);
         }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center pt-12 md:pt-20 p-4 animate-fade-in" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracker-title"
        >
            <div 
                className="w-full max-w-5xl bg-panel rounded-xl shadow-2xl border border-border pointer-events-auto flex flex-col animate-modal-pop"
                onClick={e => e.stopPropagation()}
            >
                 <header className="p-4 border-b border-border-subtle flex justify-between items-center flex-shrink-0">
                    <h2 id="tracker-title" className="font-bold text-white text-lg">Live Automations ({jobs.length})</h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><XIcon className="h-6 w-6"/></button>
                </header>
                 <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                    {jobs.length === 0 ? (
                        <p className="text-center text-text-secondary py-8">No active automation jobs.</p>
                    ) : (
                        jobs.map(job => {
                            const site = sites.find(s => s.id === job.siteId);
                            return (
                                <div key={job.jobId}>
                                    <AutomationProcessVisualizer 
                                        job={job} 
                                        siteName={site?.name || 'Unknown Site'} 
                                        onClose={() => handleClearJob(job.jobId)}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
