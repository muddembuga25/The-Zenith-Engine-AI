
import React, { useState, useCallback } from 'react';
import type { Site, ApiKeys, PostHistoryItem } from '../types';
import { generateEmailCampaign, suggestEmailTopic } from '../services/aiService';
import * as mailchimpService from '../services/mailchimpService';
import { MailIcon, ArchiveBoxIcon, LightbulbIcon } from './Icons';
import { HtmlRenderer } from './HtmlRenderer';

interface EmailMarketingTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
}

interface GenerationResult {
    subject: string;
    body: string; // HTML
}

export const EmailMarketingTab: React.FC<EmailMarketingTabProps> = ({ site, onSiteUpdate, logApiUsage, setError }) => {
    const [topic, setTopic] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [isSending, setIsSending] = useState<boolean>(false);

    const handleSuggestTopic = useCallback(async () => {
        setIsSuggesting(true);
        setError(null);
        try {
            const { suggestion, cost } = await suggestEmailTopic(site);
            logApiUsage('google', cost);
            setTopic(suggestion);
        } catch (error: any) {
            setError(error.message || "Failed to suggest an email topic.");
        } finally {
            setIsSuggesting(false);
        }
    }, [site, logApiUsage, setError]);

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError("Please enter a topic for the email campaign.");
            return;
        }
        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const { subject, body, cost, provider } = await generateEmailCampaign(topic, site);
            logApiUsage(provider, cost);
            setResult({ subject, body });
        } catch (error: any) {
            setError(error.message || "An unknown error occurred during campaign generation.");
        } finally {
            setIsLoading(false);
        }
    }, [topic, site, logApiUsage, setError]);
    
    const handleSend = async () => {
        if (!result) return;
        setIsSending(true);
        setError(null);
        try {
            const { success, message } = await mailchimpService.sendCampaign(result.subject, result.body, site);
            if (!success) {
                throw new Error(message);
            }
            handleSaveToHistory(true); // Save and clear
        } catch (error: any) {
            setError(error.message || "Failed to send campaign.");
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveToHistory = (clearAfterSave = false) => {
        if (!result) return;
        
        const newHistoryItem: PostHistoryItem = {
            id: crypto.randomUUID(),
            topic: `Email Campaign: "${result.subject}"`,
            url: '#',
            date: Date.now(),
            type: 'Email Campaign',
            emailCampaigns: { subject: result.subject, body: result.body }
        };
        onSiteUpdate('history', [newHistoryItem, ...(site.history || [])]);

        if (clearAfterSave) {
            setResult(null);
            setTopic('');
        }
    };
    
    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold text-main">Email Marketing Generator</h2>
                <p className="text-text-secondary mt-1">Craft and send complete email newsletters using AI.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="email-topic" className="block text-sm font-medium text-text-primary mb-2">Email Topic or Prompt</label>
                        <textarea id="email-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., A weekly update on new AI marketing tools..." className="input-base w-full p-3 text-sm" rows={3} disabled={isLoading} />
                         <button onClick={handleSuggestTopic} disabled={isSuggesting || isLoading} className="mt-2 w-full btn btn-secondary text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSuggesting ? 'Suggesting...' : <><LightbulbIcon className="h-4 w-4" /> Suggest Topic</>}
                        </button>
                    </div>
                    
                    <div className="p-3 bg-panel-light rounded-lg border border-border-subtle flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full flex-shrink-0 ${site.mailchimpSettings.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                         <div className="flex-1">
                            <p className="text-sm font-semibold text-main">Mailchimp Status</p>
                            <p className="text-xs text-text-secondary">{site.mailchimpSettings.statusMessage || (site.mailchimpSettings.isConnected ? 'Connected' : 'Not Connected')}</p>
                         </div>
                    </div>

                    <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="w-full btn btn-primary text-lg flex items-center justify-center gap-3 disabled:opacity-50">
                        {isLoading ? (
                            <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Generating...</>
                        ) : (
                            <><MailIcon className="h-6 w-6" /> Generate Campaign</>
                        )}
                    </button>
                </div>

                <div className="bg-panel/50 p-4 rounded-2xl border border-border min-h-[300px]">
                    <h3 className="text-lg font-bold text-blue-300">Preview</h3>
                    {isLoading ? (
                         <div className="flex items-center justify-center h-48"><p className="text-text-secondary">Generating campaign...</p></div>
                    ) : result ? (
                        <div className="w-full space-y-4 mt-4 animate-fade-in">
                            <div>
                                <label className="text-sm font-medium text-text-primary">Subject Line</label>
                                <input readOnly value={result.subject} className="input-base w-full p-2 text-sm bg-panel mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-primary">Body Preview</label>
                                <div className="mt-1 p-4 border border-border-subtle rounded-lg bg-panel max-h-80 overflow-y-auto">
                                    <HtmlRenderer content={result.body} />
                                </div>
                            </div>
                             <div className="flex gap-3 pt-4 border-t border-border-subtle">
                                <button onClick={() => handleSaveToHistory(false)} className="flex-1 btn btn-secondary flex items-center justify-center gap-2"><ArchiveBoxIcon className="h-5 w-5" /> Save</button>
                                <button onClick={handleSend} disabled={isSending || !site.mailchimpSettings.isConnected} className="flex-1 btn bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isSending ? 'Sending...' : 'Send Now'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-text-secondary p-8 h-48 flex flex-col items-center justify-center">
                            <MailIcon className="h-10 w-10 text-gray-600" />
                            <p className="mt-3 text-sm">Your generated email will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
