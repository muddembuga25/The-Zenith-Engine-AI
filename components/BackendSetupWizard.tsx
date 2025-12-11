
import React, { useState, useEffect } from 'react';
import { LogoIcon, KeyIcon, LinkIcon, LockClosedIcon, CheckCircleIcon, ExclamationTriangleIcon, UserIcon, ArrowRightIcon, TrashIcon } from './Icons';
import { verifySupabaseConnection } from '../services/dbService';
import { saveBackendConfig } from '../services/supabaseClient';

export const BackendSetupWizard: React.FC = () => {
    const [step, setStep] = useState<'root-login' | 'configure' | 'success'>('root-login');
    const [rootUser, setRootUser] = useState('');
    const [rootPass, setRootPass] = useState('');
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLocalRootExists, setIsLocalRootExists] = useState(false);

    useEffect(() => {
        const storedRoot = localStorage.getItem('zenith_root_admin');
        if (storedRoot) {
            setIsLocalRootExists(true);
        }
    }, []);

    const handleRootLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const storedRootStr = localStorage.getItem('zenith_root_admin');
            
            if (isLocalRootExists && storedRootStr) {
                const storedRoot = JSON.parse(storedRootStr);
                if (rootUser === storedRoot.username && rootPass === storedRoot.password) {
                    setStep('configure');
                } else {
                    throw new Error("Invalid Root credentials.");
                }
            } else {
                // Initialize Root
                if (rootUser.length < 4 || rootPass.length < 6) {
                    throw new Error("Username must be 4+ chars and password 6+ chars.");
                }
                localStorage.setItem('zenith_root_admin', JSON.stringify({ username: rootUser, password: rootPass }));
                setIsLocalRootExists(true);
                setStep('configure');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetRoot = () => {
        if (window.confirm("This will clear the existing Root Administrator credentials and allow you to create new ones. Continue?")) {
            localStorage.removeItem('zenith_root_admin');
            setIsLocalRootExists(false);
            setRootUser('');
            setRootPass('');
            setError(null);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // Verify connection using the existing service
            const result = await verifySupabaseConnection({ url: dbUrl, anonKey: dbKey, status: 'disconnected' });
            
            if (result.success) {
                setStep('success');
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            setError(err.message || "Failed to connect to backend.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLaunch = () => {
        saveBackendConfig(dbUrl, dbKey);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 p-4 font-sans text-white selection:bg-blue-500/30">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden relative">
                {/* Background ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="p-8 relative z-10">
                    <div className="flex justify-center mb-8">
                        <div className="p-3 bg-gray-800 rounded-xl border border-gray-700 shadow-inner">
                            <LogoIcon className="h-10 w-10 text-blue-500" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-white">System Initialization</h1>
                        <p className="text-gray-400 text-sm mt-2">
                            {step === 'root-login' && (isLocalRootExists ? "Authenticate as Root Administrator" : "Create Root Administrator Account")}
                            {step === 'configure' && "Establish Backend Connection"}
                            {step === 'success' && "System Online"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-3 animate-fade-in">
                            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 'root-login' && (
                        <form onSubmit={handleRootLogin} className="space-y-5 animate-fade-in">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Root Username</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type="text" 
                                        required
                                        value={rootUser}
                                        onChange={e => setRootUser(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                                        placeholder="admin"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Root Password</label>
                                <div className="relative group">
                                    <LockClosedIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type="password" 
                                        required
                                        value={rootPass}
                                        onChange={e => setRootPass(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {isLocalRootExists ? 'Unlock System' : 'Initialize System'}
                                        <ArrowRightIcon className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                            
                            {isLocalRootExists && (
                                <button 
                                    type="button" 
                                    onClick={handleResetRoot}
                                    className="w-full text-center text-xs text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 mt-4"
                                >
                                    <TrashIcon className="h-3 w-3" /> Reset Root Credentials
                                </button>
                            )}
                        </form>
                    )}

                    {step === 'configure' && (
                        <form onSubmit={handleConnect} className="space-y-5 animate-fade-in">
                            <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl mb-6">
                                <p className="text-sm text-blue-200">
                                    Please provide your <strong>Supabase</strong> connection details to enable the backend services.
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Project URL</label>
                                <div className="relative group">
                                    <LinkIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type="url" 
                                        required
                                        value={dbUrl}
                                        onChange={e => setDbUrl(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                                        placeholder="https://your-project.supabase.co"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Anon / Public Key</label>
                                <div className="relative group">
                                    <KeyIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type="password" 
                                        required
                                        value={dbKey}
                                        onChange={e => setDbKey(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                                        placeholder="eyJh..."
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>Verify & Connect <CheckCircleIcon className="h-4 w-4" /></>
                                )}
                            </button>
                        </form>
                    )}

                    {step === 'success' && (
                        <div className="text-center animate-fade-in py-4">
                            <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                <CheckCircleIcon className="h-10 w-10 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Connection Established</h3>
                            <p className="text-gray-400 text-sm">
                                The backend is now online. Click below to launch the system.
                            </p>
                            <div className="mt-8">
                                <button 
                                    onClick={handleLaunch}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Launch Zenith OS
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer Status Bar */}
                <div className="bg-gray-950 border-t border-gray-800 p-3 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                    <span>Zenith OS v1.0</span>
                    <span className={step === 'success' ? "text-green-500" : "text-yellow-500"}>
                        {step === 'success' ? "ONLINE" : "OFFLINE"}
                    </span>
                </div>
            </div>
        </div>
    );
};
