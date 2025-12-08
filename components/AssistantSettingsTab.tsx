
import React from 'react';
import type { Site } from '../types';

interface AssistantSettingsTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
}

export const AssistantSettingsTab: React.FC<AssistantSettingsTabProps> = ({ site, onSiteUpdate }) => {
    return (
        <div className="max-w-2xl mx-auto">
             <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold text-white">AI Agent</h2>
                <p className="text-text-secondary mt-1">Configure the on-demand AI agent for voice, video, and text commands to help you use the application.</p>
            </div>
            <div className="mt-6 p-6 bg-panel/50 rounded-2xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                    <label htmlFor="enable-assistant" className="font-medium text-text-primary cursor-pointer">Enable AI Agent</label>
                    <label className="relative inline-flex items-center cursor-pointer"><input id="enable-assistant" type="checkbox" className="sr-only peer" checked={site.isAssistantEnabled ?? true} onChange={e => onSiteUpdate('isAssistantEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-600/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                </div>
                {(site.isAssistantEnabled ?? true) && (
                    <div className="pl-6 border-l-2 border-border-subtle space-y-3 pt-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <label htmlFor="show-voice-btn" className="text-sm text-text-secondary cursor-pointer">Show Voice Button</label>
                            <label className="relative inline-flex items-center cursor-pointer"><input id="show-voice-btn" type="checkbox" className="sr-only peer" checked={site.isVoiceControlEnabled ?? true} onChange={e => onSiteUpdate('isVoiceControlEnabled', e.target.checked)} /><div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div></label>
                        </div>
                         <div className="flex items-center justify-between">
                            <label htmlFor="show-video-btn" className="text-sm text-text-secondary cursor-pointer">Show Video Button</label>
                            <label className="relative inline-flex items-center cursor-pointer"><input id="show-video-btn" type="checkbox" className="sr-only peer" checked={site.isVideoControlEnabled ?? true} onChange={e => onSiteUpdate('isVideoControlEnabled', e.target.checked)} /><div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div></label>
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="show-text-btn" className="text-sm text-text-secondary cursor-pointer">Show Text Button</label>
                            <label className="relative inline-flex items-center cursor-pointer"><input id="show-text-btn" type="checkbox" className="sr-only peer" checked={site.isTextControlEnabled ?? true} onChange={e => onSiteUpdate('isTextControlEnabled', e.target.checked)} /><div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div></label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
