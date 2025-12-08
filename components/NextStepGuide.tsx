import React from 'react';
import { ArrowRightIcon } from './Icons';

interface NextStepGuideProps {
  label: string;
  description: string;
  onClick: () => void;
}

export const NextStepGuide: React.FC<NextStepGuideProps> = ({ label, description, onClick }) => (
  <div className="mt-12 p-6 bg-panel/50 rounded-2xl border border-dashed border-blue-500/50">
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <div className="text-center sm:text-left flex-1">
        <h4 className="text-lg font-bold text-white">Next Step: {label}</h4>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      </div>
      <button onClick={onClick} className="btn btn-primary flex items-center gap-2 w-full sm:w-auto">
        <span>Continue</span>
        <ArrowRightIcon className="h-5 w-5" />
      </button>
    </div>
  </div>
);
