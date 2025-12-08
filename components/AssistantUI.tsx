
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Site, RssSource } from '../types';
import { GoogleGenAI, Modality, Type, LiveSession, LiveServerMessage, FunctionDeclaration, Blob as GenaiBlob, Chat, GenerateContentResponse } from "@google/genai";
import { SparklesIcon, MicrophoneIcon, ChatBubbleOvalLeftEllipsisIcon, VideoCameraIcon, XIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';

// --- PROPS ---
interface AssistantProps {
    site: Site;
    actions: {
        onFindNextTopic: () => string;
        onResearchKeyword: (keyword: string) => Promise<string>;
        onBrainstormAndAddTopics: (args: { query: string; count: number }) => Promise<string>;
        onGenerateArticle: (topic: string) => Promise<string>;
        onUpdateSiteField: (field: keyof Site, value: any) => string;
        onRunSocialGraphicAutomation: () => Promise<string>;
        onRunSocialVideoAutomation: () => Promise<string>;
        onNavigateToTab: (args: { tab: string; subTab?: string }) => string;
        onGetAutomationStatus: () => string;
        onUpdateAutomationSetting: (args: { settingName: keyof Site, settingValue: any }) => string;
    }
}

// --- TYPES ---
type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'pending_confirmation' | 'error';
type SessionMode = 'voice' | 'video' | 'text' | null;
type PendingAction = {
    id: string;
    name: string;
    args: any;
    handler: (...args: any[]) => Promise<any>;
};
type Transcription = {
    id: string;
    type: 'user' | 'model';
    text: string;
};

// --- AUDIO HELPERS (as per @google/genai guidelines) ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
function createBlob(data: Float32Array): GenaiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


// --- MAIN COMPONENT ---
export const AssistantUI: React.FC<AssistantProps> = ({ site, actions }) => {
    const [assistantState, setAssistantState] = useState<AssistantState>('idle');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    const [sessionMode, setSessionMode] = useState<SessionMode>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [textInput, setTextInput] = useState('');
    
    // --- Refs for state that shouldn't re-render ---
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const chatSessionRef = useRef<Chat | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRefs = useRef<{ input: AudioContext | null, output: AudioContext | null, scriptProcessor: ScriptProcessorNode | null, source: MediaStreamAudioSourceNode | null }>({ input: null, output: null, scriptProcessor: null, source: null });
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const chatHistoryRef = useRef<HTMLDivElement | null>(null);
    const interruptionCounterRef = useRef(0);


    // --- Audio Playback Queue ---
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const functionDeclarations: FunctionDeclaration[] = useMemo(() => [
        { name: 'getAutomationStatus', description: "Checks the current configuration status for all automation workflows (blog, social graphics, social video). Use this first to understand what needs to be configured before guiding the user.", parameters: { type: Type.OBJECT, properties: {} } },
        { 
            name: 'updateAutomationSetting', 
            description: "Updates a specific setting for an automation workflow.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    settingName: {
                        type: Type.STRING,
                        description: "The name of the setting to update. Valid options are: 'isAutomationEnabled', 'isAutoPublishEnabled', 'automationTrigger', 'dailyGenerationSource', 'scheduleGenerationSource', 'automationDailyTime', 'isSocialGraphicAutomationEnabled', 'socialGraphicGenerationSource', 'isSocialVideoAutomationEnabled', 'socialVideoGenerationSource'."
                    },
                    settingValue: {
                        type: Type.STRING,
                        description: "The new value for the setting. For boolean fields, use 'true' or 'false'. For trigger fields, use 'daily' or 'schedule'. For source fields, use 'keyword', 'rss', 'video', etc. For time fields, use 'HH:MM' format."
                    }
                },
                required: ['settingName', 'settingValue']
            }
        },
        { name: 'findNextTopic', description: "Finds the next available topic from the Master Content Source (e.g., Keyword List).", parameters: { type: Type.OBJECT, properties: {} } },
        { name: 'researchKeyword', description: "Performs deep SEO research on a given keyword and returns a better long-tail keyword.", parameters: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING, description: "The keyword to research." } }, required: ['keyword'] } },
        { name: 'brainstormAndAddTopics', description: "Brainstorms new blog post ideas based on a query and adds them to the keyword list.", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: "The topic to brainstorm about." }, count: { type: Type.NUMBER, description: "The number of ideas to generate." } }, required: ['query'] } },
        { name: 'generateArticle', description: "Initiates the full pipeline to generate and optimize a blog post on a given topic.", parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING, description: "The topic of the article to generate." } }, required: ['topic'] } },
        {
            name: 'navigateToTab',
            description: "Navigates to a specific tab or page within the Zenith Engine AI application.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    tab: {
                        type: Type.STRING,
                        description: "The name of the tab to navigate to. E.g., 'Dashboard', 'Content Hub', 'Settings', 'Branding', 'Automation'."
                    },
                    subTab: {
                        type: Type.STRING,
                        description: "Optional. The name of the sub-tab to navigate to within a main tab like 'Content Hub'."
                    }
                },
                required: ['tab']
            }
        }
    ], []);

    const functionHandlers = useMemo(() => ({
        'getAutomationStatus': actions.onGetAutomationStatus,
        'updateAutomationSetting': actions.onUpdateAutomationSetting,
        'findNextTopic': actions.onFindNextTopic,
        'researchKeyword': (args: { keyword: string }) => actions.onResearchKeyword(args.keyword),
        'brainstormAndAddTopics': actions.onBrainstormAndAddTopics,
        'generateArticle': (args: { topic: string }) => actions.onGenerateArticle(args.topic),
        'updateSiteField': (args: { field: keyof Site, value: any }) => actions.onUpdateSiteField(args.field, args.value),
        'runSocialGraphicAutomation': actions.onRunSocialGraphicAutomation,
        'runSocialVideoAutomation': actions.onRunSocialVideoAutomation,
        'navigateToTab': actions.onNavigateToTab,
    }), [actions]);

    const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    useEffect(() => {
        const checkCameras = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                setHasMultipleCameras(videoInputs.length > 1);
            } catch (e) {
                console.warn("Could not enumerate devices:", e);
            }
        };
        checkCameras();
    }, []);

    const closeMediaDevices = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRefs.current.input) {
            audioContextRefs.current.input.close();
            audioContextRefs.current.input = null;
        }
        if (audioContextRefs.current.output) {
            audioContextRefs.current.output.close();
            audioContextRefs.current.output = null;
        }
        if (audioContextRefs.current.scriptProcessor) {
            audioContextRefs.current.scriptProcessor.disconnect();
            audioContextRefs.current.scriptProcessor = null;
        }
        if (audioContextRefs.current.source) {
            audioContextRefs.current.source.disconnect();
            audioContextRefs.current.source = null;
        }
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }, []);

    const stopSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) { console.error("Error closing session:", e); }
            sessionPromiseRef.current = null;
        }
        chatSessionRef.current = null;
        closeMediaDevices();
        setSessionMode(null);
        setAssistantState('idle');
        setIsMenuOpen(false);
    }, [closeMediaDevices]);

    const systemInstruction = `You are the "Zenith Engine AI Agent". You are an expert co-pilot for the Zenith Engine AI application, designed to guide users seamlessly through its features. Your responses must be helpful, concise, and knowledgeable. Never mention you are a large language model or Gemini.

**CORE APPLICATION LOGIC - YOUR MENTAL MODEL:**
You must understand that the application follows a logical flow. Here is your internal knowledge base:
1.  **Connections are foundational.** The app's power comes from connecting to other services.
    - **WordPress (in Settings):** This is the *most critical* connection for publishing blog posts.
    - **Social Media (in Connections):** Required for any social automation or posting.
    - **Analytics/Mailchimp (in Connections):** Required for performance tracking and email marketing.
2.  **Branding & Context is the AI's brain.** The quality of all generated content depends entirely on this section. A detailed Brand Guideline is paramount.
3.  **Content Hub is the fuel.** This is where users manage their content ideas (keywords, RSS feeds, videos, etc.). Without sources here, automation has nothing to work on.
4.  **Automation puts it all together.** The Automation tabs use the sources from the Content Hub to generate content based on the Brand Guideline and publish it via the Connections.

**USER GUIDANCE WORKFLOWS - YOUR PRIMARY DIRECTIVES:**

**1. Onboarding & General Help ("I'm lost", "How do I start?"):**
   - Your primary goal is to get the user to their first published post.
   - **Step 1: Diagnose.** ALWAYS start by silently calling \`getAutomationStatus\` to understand the system's state. DO NOT ask the user "Is your WordPress connected?". You should already know.
   - **Step 2: Identify the Bottleneck.** Based on the status, find the very first missing step in this critical path:
      a. WordPress Connection (\`isWordPressConnected: false\`).
      b. Content Sources (\`hasContentSources: false\`).
   - **Step 3: Guide & Navigate.** Propose the next logical step and offer to take them there.
      - *Example if WP not connected:* "To get started, we first need to connect your WordPress site. Shall we head over to the Settings tab to set that up?" -> \`navigateToTab({tab: 'settings'})\`.
      - *Example if no content sources:* "Great, your site is connected! Now we need some content ideas. Let's go to the Content Hub to add your first topic." -> \`navigateToTab({tab: 'content', subTab: 'blog'})\`.
   - **Step 4: Empower.** Once on the right screen, explain what they need to do. Offer to help further (e.g., "Once you've added a topic, just ask me to 'generate the next article'").

**2. Automation Setup ("Set up my blog automation"):**
   - **Step 1: Diagnose.** As always, call \`getAutomationStatus\`.
   - **Step 2: Prerequisites.** Ensure WordPress is connected and content sources exist, guiding the user to fix these first using the Onboarding workflow.
   - **Step 3: Configure.** Once prerequisites are met, ask clarifying questions and use \`updateAutomationSetting\` to apply their choices.
      - *Example:* "Okay, automation is ready to be enabled. Do you prefer 'Autopilot' (fully automatic publishing) or 'Human Review' (posts are saved as drafts for you to approve)?" -> \`updateAutomationSetting({settingName: 'isAutoPublishEnabled', settingValue: 'true'})\`.
      - *Example:* "And for the trigger, do you want it to run 'daily' at a set time, or on a specific 'schedule' (like every Monday and Friday)?" -> \`updateAutomationSetting({settingName: 'automationTrigger', settingValue: 'daily'})\`.
   - **Step 4: Confirm.** After each change, confirm what you've done. "Great, I've set your blog to Autopilot mode."

**3. Content Creation ("Write an article", "Get me some ideas"):**
   - **To generate:** If they give a topic, confirm and call \`generateArticle\`. If not, call \`findNextTopic\` first, confirm the topic with the user, then call \`generateArticle\`.
   - **To brainstorm:** Ask what they want ideas about. Use \`brainstormAndAddTopics\` to find and add ideas directly to their keyword list.
   - **To research:** Use \`researchKeyword\` to turn a broad idea into a specific, SEO-optimized long-tail keyword.

**4. Improving AI Quality ("The writing is bland", "How do I make it sound like me?"):**
   - Your IMMEDIATE response is to guide them to the **Branding & Context** tab.
   - Explain that the **Brand Guideline** is the most powerful tool for influencing the AI's output.
   - Offer to navigate them there: "The best way to improve the AI's quality is to give it a strong Brand Guideline. Let's head to the 'Branding & Context' tab so you can refine it." -> \`navigateToTab({tab: 'branding'})\`.

You are in full control. Be a proactive, intelligent guide that makes the application feel effortless.
Current site: "${site.name}". Brand guidelines: "${site.brandGuideline}".`;

    const startLiveSession = useCallback(async (mode: 'voice' | 'video') => {
        const googleApiKey = process.env.API_KEY;
        if (!googleApiKey) {
            setSessionMode(mode);
            setAssistantState('error');
            setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: "Google API key is not configured in the application environment." }]);
            return;
        }
        setIsMenuOpen(false);
        setSessionMode(mode);
        setAssistantState('listening');
        setTranscriptions([]);
        setPendingAction(null);
        interruptionCounterRef.current = 0;


        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' ? { facingMode } : false });
            mediaStreamRef.current = stream;

            if (mode === 'video' && videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            const ai = new GoogleGenAI({ apiKey: googleApiKey });
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRefs.current = { ...audioContextRefs.current, input: inputAudioContext, output: outputAudioContext };
            
            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                        audioContextRefs.current.scriptProcessor = scriptProcessor;
                        audioContextRefs.current.source = source;

                        if (mode === 'video' && videoRef.current && canvasRef.current) {
                            const videoEl = videoRef.current;
                            const canvasEl = canvasRef.current;
                            const ctx = canvasEl.getContext('2d');
                            if (!ctx) return;
                            
                            frameIntervalRef.current = window.setInterval(() => {
                                canvasEl.width = videoEl.videoWidth;
                                canvasEl.height = videoEl.videoHeight;
                                ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                                canvasEl.toBlob(async (blob) => {
                                    if (blob) {
                                        const base64Data = await blobToBase64(blob);
                                        sessionPromiseRef.current?.then((session) => {
                                            session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                                        });
                                    }
                                }, 'image/jpeg', 0.8);
                            }, 1000 / 5); // 5 FPS
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const currentInterruptionCount = interruptionCounterRef.current;
                        
                        // Always handle interruption first to stop audio playback immediately.
                        if (message.serverContent?.interrupted) {
                            interruptionCounterRef.current++;
                            audioSourcesRef.current.forEach(source => source.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }

                        setAssistantState('thinking');

                        // Process audio playback.
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                            setAssistantState('speaking');
                            const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                            const outputCtx = audioContextRefs.current.output;
                            if (outputCtx) {
                                // This part is async, so we must check for interruptions after awaiting.
                                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                                
                                // Check if an interruption happened while we were busy decoding.
                                if (interruptionCounterRef.current !== currentInterruptionCount) {
                                    return; // This audio is from a previous, interrupted turn. Discard.
                                }

                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                                const source = outputCtx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputCtx.destination);
                                source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                audioSourcesRef.current.add(source);
                            }
                        }
                        
                        // After potential async operations, we must check again.
                        if (interruptionCounterRef.current !== currentInterruptionCount) {
                            return;
                        }

                        // Handle transcriptions and tool calls.
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            if (currentInputTranscription.trim()) setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'user', text: currentInputTranscription.trim() }]);
                            if (currentOutputTranscription.trim()) setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: currentOutputTranscription.trim() }]);
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                            setAssistantState('listening');
                        }
                        if (message.toolCall?.functionCalls) {
                            const fc = message.toolCall.functionCalls[0];
                            const handler = (functionHandlers as any)[fc.name];
                            if (handler) {
                                setPendingAction({ id: fc.id, name: fc.name, args: fc.args, handler });
                                setAssistantState('pending_confirmation');
                            }
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setAssistantState('error');
                        setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: "A session error occurred. Please try again." }]);
                        stopSession();
                    },
                    onclose: () => {
                        console.log('Session closed.');
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    tools: [{ functionDeclarations }],
                    systemInstruction,
                },
            });
            await sessionPromiseRef.current;
        } catch (e) {
            console.error("Failed to start session:", e);
            closeMediaDevices();
            setSessionMode(mode);
            setAssistantState('error');
            setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: `Could not start the session. Please check microphone/camera permissions. Error: ${(e as Error).message}` }]);
        }
    }, [site.name, site.brandGuideline, stopSession, functionDeclarations, functionHandlers, facingMode, closeMediaDevices, systemInstruction]);

    const startTextSession = useCallback(() => {
        setIsMenuOpen(false);
        setSessionMode('text');
        setTranscriptions([]);
        setPendingAction(null);
        setAssistantState('idle');

        const googleApiKey = process.env.API_KEY;
        if (!googleApiKey) {
            setAssistantState('error');
            setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: "Google API key is not configured in the application environment." }]);
            return;
        }

        const ai = new GoogleGenAI({ apiKey: googleApiKey });
        chatSessionRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            tools: [{ functionDeclarations }],
            config: { systemInstruction },
        });
    }, [functionDeclarations, systemInstruction]);

    const handleTextSubmit = async () => {
        if (!textInput.trim() || !chatSessionRef.current || assistantState === 'thinking') return;
        
        const currentText = textInput;
        setTextInput('');
        setAssistantState('thinking');
        setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'user', text: currentText }]);
        
        try {
            let response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: currentText });
            
            if (response.functionCalls && response.functionCalls.length > 0) {
                setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: `Okay, running the requested action...` }]);

                const functionResponses = await Promise.all(
                    response.functionCalls.map(async (fc) => {
                        const handler = (functionHandlers as any)[fc.name];
                        if (handler) {
                            try {
                                const result = await handler(fc.args);
                                return {
                                    function_response: {
                                        name: fc.name,
                                        response: { result: result || "OK" },
                                    },
                                };
                            } catch (e) {
                                console.error(`Error executing function ${fc.name}:`, e);
                                return {
                                    function_response: {
                                        name: fc.name,
                                        response: { result: `Error: ${(e as Error).message}` },
                                    },
                                };
                            }
                        }
                        return {
                            function_response: {
                                name: fc.name,
                                response: { result: `Error: Function ${fc.name} not found.` },
                            },
                        };
                    })
                );
                
                const finalResponse = await chatSessionRef.current.sendMessage({ tool_responses: functionResponses });
                setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: finalResponse.text }]);

            } else {
                setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: response.text }]);
            }

        } catch(e) {
            console.error("Text chat error:", e);
            setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: `An error occurred: ${(e as Error).message}` }]);
        } finally {
            setAssistantState('idle');
        }
    };

    const handleConfirmAction = async () => {
        if (!pendingAction || !sessionPromiseRef.current) return;
        
        const { id, name, args, handler } = pendingAction;
        setPendingAction(null);
        setAssistantState('thinking');
        
        try {
            const result = await handler(args);
            const session = await sessionPromiseRef.current;
            session.sendToolResponse({
                functionResponses: { id, name, response: { result: result || 'OK' } }
            });
        } catch (e) {
            console.error("Error executing action:", e);
            setAssistantState('error');
            setTranscriptions(prev => [...prev, { id: crypto.randomUUID(), type: 'model', text: `Error running action: ${(e as Error).message}` }]);
        }
    };
    
    const handleCancelAction = async () => {
        if (!pendingAction || !sessionPromiseRef.current) return;
        const { id, name } = pendingAction;
        setPendingAction(null);
        try {
            const session = await sessionPromiseRef.current;
            session.sendToolResponse({
                functionResponses: { id, name, response: { result: "User cancelled." } }
            });
            setAssistantState('listening');
        } catch (e) {
            console.error("Error cancelling action:", e);
        }
    };

    useEffect(() => {
        chatHistoryRef.current?.scrollTo(0, chatHistoryRef.current.scrollHeight);
    }, [transcriptions]);

    const menuButtonClasses = "w-14 h-14 rounded-full flex items-center justify-center shadow-lg";
    
    return (
        <>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="fixed bottom-48 right-4 md:right-6 z-40">
                <div className="relative flex h-14 w-14 items-center justify-center">
                    {/* Fly-out buttons */}
                    {(site.isTextControlEnabled ?? true) && (
                        <button
                            onClick={startTextSession}
                            className={`${menuButtonClasses} absolute bg-green-500 hover:bg-green-400 transition-all duration-300 ease-out ${isMenuOpen ? 'opacity-100 -translate-y-[4.5rem]' : 'opacity-0'}`}
                            style={{ transitionDelay: isMenuOpen ? '50ms' : '200ms' }}
                            aria-label="Start Text Agent"
                        >
                            <ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7 text-white" />
                        </button>
                    )}
                    {(site.isVoiceControlEnabled ?? true) && (
                        <button
                            onClick={() => startLiveSession('voice')}
                            className={`${menuButtonClasses} absolute bg-blue-500 hover:bg-blue-400 transition-all duration-300 ease-out ${isMenuOpen ? 'opacity-100 -translate-y-[8.5rem]' : 'opacity-0'}`}
                            style={{ transitionDelay: isMenuOpen ? '100ms' : '100ms' }}
                            aria-label="Start Voice Agent"
                        >
                            <MicrophoneIcon className="h-7 w-7 text-white" />
                        </button>
                    )}
                    {(site.isVideoControlEnabled ?? true) && (
                        <button
                            onClick={() => startLiveSession('video')}
                            className={`${menuButtonClasses} absolute bg-red-500 hover:bg-red-400 transition-all duration-300 ease-out ${isMenuOpen ? 'opacity-100 -translate-y-[12.5rem]' : 'opacity-0'}`}
                            style={{ transitionDelay: isMenuOpen ? '150ms' : '0ms' }}
                            aria-label="Start Video Agent"
                        >
                            <VideoCameraIcon className="h-7 w-7 text-white" />
                        </button>
                    )}

                    {/* Main floating action button */}
                    <button 
                        onClick={() => setIsMenuOpen(p => !p)} 
                        className={`${menuButtonClasses} relative z-10 transition-all duration-300 ease-in-out transform ${isMenuOpen ? 'bg-gray-600' : 'bg-brand-primary hover:bg-brand-primary-hover animate-orb-pulse shadow-lg'}`}
                        aria-label={isMenuOpen ? 'Close Agent Menu' : 'Open Agent Menu'}
                        aria-expanded={isMenuOpen}
                    >
                        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out transform ${isMenuOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
                            <SparklesIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out transform ${isMenuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
                            <XIcon className="h-7 w-7 text-white" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Session UI */}
            {sessionMode && (
                 <div className="fixed bottom-48 right-4 md:right-6 z-50">
                    <div className="bg-panel rounded-xl shadow-2xl w-[90vw] max-w-[450px] border border-border animate-fade-in-up max-h-[600px] flex flex-col" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
                        <header className="p-4 border-b border-border-subtle flex justify-between items-center flex-shrink-0">
                            <h2 id="assistant-title" className="font-bold text-main text-lg flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full transition-colors ${assistantState === 'listening' ? 'bg-blue-400 animate-pulse' : assistantState === 'speaking' || assistantState === 'thinking' ? 'bg-blue-400 animate-pulse' : assistantState === 'error' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                                Zenith Engine AI Agent
                            </h2>
                            <div className="flex items-center gap-2">
                                {sessionMode === 'video' && hasMultipleCameras && <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="btn btn-secondary p-2"><ArrowPathIcon className="h-5 w-5"/></button>}
                                <button onClick={stopSession} className="btn btn-secondary p-2"><XIcon className="h-5 w-5"/></button>
                            </div>
                        </header>
                        <div className="flex-1 min-h-0 overflow-y-auto p-4" ref={chatHistoryRef}>
                            {sessionMode === 'video' && <video ref={videoRef} autoPlay muted playsInline className="w-full h-48 rounded-lg bg-black mb-4 object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}></video>}
                            <div className="space-y-4">
                                {transcriptions.map(t => (
                                    <div key={t.id} className={`flex items-start gap-3 ${t.type === 'user' ? 'justify-end' : ''}`}>
                                        {t.type === 'model' && <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><SparklesIcon className="h-5 w-5 text-white"/></div>}
                                        <div className={`max-w-md p-3 rounded-xl ${t.type === 'user' ? 'bg-blue-600 text-white' : 'bg-panel-light text-text-primary'}`}>
                                            <p className="text-sm leading-relaxed">{t.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {sessionMode === 'text' && (
                            <div className="p-4 border-t border-border-subtle flex-shrink-0">
                                <form onSubmit={e => { e.preventDefault(); handleTextSubmit(); }} className="flex gap-2">
                                    <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Type your message..." className="input-base px-4 py-2 flex-1" disabled={assistantState === 'thinking'} />
                                    <button type="submit" className="btn btn-primary" disabled={assistantState === 'thinking'}>Send</button>
                                </form>
                            </div>
                        )}
                        {pendingAction && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 rounded-xl">
                                <div className="bg-panel-light p-6 rounded-lg border border-blue-500/50 max-w-sm text-center animate-modal-pop">
                                    <h3 className="font-bold text-main">Confirm Action</h3>
                                    <p className="text-sm text-text-secondary mt-2">The agent wants to run the function: <strong className="text-blue-300">{pendingAction.name}</strong></p>
                                    <pre className="text-xs text-left bg-black/20 p-2 rounded-md mt-3 overflow-x-auto"><code>{JSON.stringify(pendingAction.args, null, 2)}</code></pre>
                                    <div className="mt-4 flex gap-3">
                                        <button onClick={handleCancelAction} className="flex-1 btn btn-secondary">Cancel</button>
                                        <button onClick={handleConfirmAction} className="flex-1 btn btn-primary flex items-center justify-center gap-2"><CheckCircleIcon className="h-5 w-5"/>Confirm</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
            )}
        </>
    );
};
