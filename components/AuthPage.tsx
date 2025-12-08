
import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';
import type { User, SubscriptionPlan } from '../types';
import { LogoIcon, MailIcon, KeyIcon, UserIcon, SparklesIcon, EyeIcon, EyeSlashIcon, GoogleIcon, ArrowUturnLeftIcon, ClockIcon, WordPressIcon, SunIcon, MoonIcon } from './Icons';

interface AuthPageProps {
    onAuthSuccess: (user: User) => void;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, theme, toggleTheme }) => {
    const [mode, setMode] = useState<'welcome' | 'signIn' | 'signUp' | 'adminSignUp'>('welcome');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [adminExists, setAdminExists] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const localFlag = localStorage.getItem('zenith-engine-ai-admin-created');
                if (localFlag === 'true') {
                    setAdminExists(true);
                    return;
                }

                const exists = await authService.hasAdmin();
                if (exists) {
                    localStorage.setItem('zenith-engine-ai-admin-created', 'true');
                }
                setAdminExists(exists);

            } catch (e: any) {
                console.error("Failed to check for admin:", e);
                setAdminExists(true); // Fail safe to normal login
                setError("Could not check application status. Please try again.");
            }
        };
        checkAdminStatus();
    }, []);

    const generateStrongPassword = () => {
        const length = 16;
        const lower = "abcdefghijklmnopqrstuvwxyz";
        const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
        const allChars = lower + upper + numbers + symbols;

        let pass = "";
        pass += lower[Math.floor(Math.random() * lower.length)];
        pass += upper[Math.floor(Math.random() * upper.length)];
        pass += numbers[Math.floor(Math.random() * numbers.length)];
        pass += symbols[Math.floor(Math.random() * symbols.length)];

        for (let i = 4; i < length; i++) {
            pass += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        return pass.split('').sort(() => 0.5 - Math.random()).join('');
    };

    const handleSuggestPassword = () => {
        const newPassword = generateStrongPassword();
        setPassword(newPassword);
        setIsPasswordVisible(true); // Show the generated password
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (mode === 'signIn') {
                const user = await authService.signIn(email, password);
                onAuthSuccess(user);
                return;
            }

            const user = await authService.signUp(
                email,
                password,
                username,
                firstName,
                lastName,
                'agency', 
                'monthly',
                mode === 'adminSignUp'
            );
            
            onAuthSuccess(user);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const user = await authService.signInWithGoogle();
            onAuthSuccess(user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (adminExists === null) {
        return (
            <div className="h-full w-full flex items-center justify-center p-4 bg-app">
                <div className="animate-pulse-engine rounded-full p-4">
                    <LogoIcon className="h-10 w-10 text-brand-primary animate-spin" />
                </div>
            </div>
        );
    }

    const isAnySignUp = mode === 'signUp' || mode === 'adminSignUp';
    const titleText = mode === 'adminSignUp' ? 'Create Admin Account' : mode === 'signUp' ? 'Create Your Account' : 'Welcome Back';
    const subtitleText = mode === 'adminSignUp' ? 'Set up the first administrative user.' : mode === 'signUp' ? 'Start your automated content journey.' : 'Enter your credentials to access your workspace.';

    if (mode === 'welcome') {
        return (
            <div className="min-h-full w-full flex items-stretch bg-app relative overflow-hidden transition-colors duration-300">
                {/* Theme Toggle - Absolute Top Right */}
                <div className="absolute top-6 right-6 z-20">
                    <button onClick={toggleTheme} className="p-3 rounded-full bg-panel/50 backdrop-blur-md border border-border text-sub hover:text-main transition-colors shadow-lg">
                        {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </button>
                </div>

                {/* Left Content */}
                <div className="hidden lg:flex flex-1 flex-col justify-center px-12 relative z-10 border-r border-border bg-panel/30 backdrop-blur-sm">
                    <div className="max-w-xl mx-auto">
                        <div className="mb-8">
                            <LogoIcon className="h-16 w-16 text-brand-primary" />
                        </div>
                        <h1 className="text-5xl font-bold text-main leading-tight tracking-tight mb-6">
                            Autonomous Content <br/>
                            <span className="text-brand-primary text-glow">Engineering.</span>
                        </h1>
                        <p className="text-lg text-sub mb-12 leading-relaxed">
                            Zenith Engine AI isn't just a tool; it's your entire content team in code. Generate, optimize, and publish with precision.
                        </p>
                        
                        <div className="grid gap-6">
                            <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-panel/50 hover:border-brand-primary/30 transition-colors">
                                <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><SparklesIcon className="h-6 w-6" /></div>
                                <div>
                                    <h3 className="font-semibold text-main">AI-Driven SEO</h3>
                                    <p className="text-sm text-sub mt-1">Strategic keyword analysis and optimized content generation.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-panel/50 hover:border-brand-primary/30 transition-colors">
                                <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><ClockIcon className="h-6 w-6" /></div>
                                <div>
                                    <h3 className="font-semibold text-main">24/7 Automation</h3>
                                    <p className="text-sm text-sub mt-1">Set schedules and let the engine run autonomously.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content / Mobile Full */}
                <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center lg:hidden mb-8">
                            <LogoIcon className="h-12 w-12 text-brand-primary mx-auto" />
                            <h1 className="mt-4 text-3xl font-bold text-main">Zenith Engine AI</h1>
                        </div>

                        <div className="premium-panel p-8 md:p-10 backdrop-blur-xl bg-panel/80 shadow-2xl">
                            <h2 className="text-2xl font-bold text-center text-main mb-2">Get Started</h2>
                            <p className="text-center text-sub text-sm mb-8">Choose how you want to access the platform.</p>

                            <div className="space-y-6">
                                {/* Primary Create Account Option */}
                                <button 
                                    onClick={() => setMode('signUp')} 
                                    className="w-full btn btn-primary py-4 text-base shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-3 transform hover:scale-[1.02] transition-all"
                                >
                                    <MailIcon className="h-5 w-5" />
                                    Create Account
                                </button>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                                    <div className="relative flex justify-center"><span className="bg-panel px-4 text-xs text-tertiary uppercase tracking-wider">Existing Users</span></div>
                                </div>

                                <div className="space-y-3">
                                    <button onClick={() => setMode('signIn')} className="w-full btn btn-secondary py-3 text-base">
                                        Sign In
                                    </button>

                                    <button
                                        onClick={handleGoogleSignIn}
                                        disabled={isLoading}
                                        className="w-full btn bg-white text-black hover:bg-gray-100 border-none py-3 text-base font-medium flex items-center justify-center gap-3 shadow-md"
                                    >
                                        <GoogleIcon className="h-5 w-5" />
                                        Google
                                    </button>
                                </div>

                                {adminExists === false && (
                                    <button onClick={() => setMode('adminSignUp')} className="w-full mt-4 text-sm text-yellow-500 hover:text-yellow-400 font-medium flex items-center justify-center gap-2 py-2 opacity-50 hover:opacity-100 transition-opacity">
                                        <SparklesIcon className="h-4 w-4" />
                                        Initialize Admin Account
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-center text-xs text-tertiary">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full w-full flex items-center justify-center p-4 bg-app relative overflow-hidden transition-colors duration-300">
            {/* Theme Toggle - Absolute Top Right */}
            <div className="absolute top-6 right-6 z-20">
                <button onClick={toggleTheme} className="p-3 rounded-full bg-panel/50 backdrop-blur-md border border-border text-sub hover:text-main transition-colors shadow-lg">
                    {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
            </div>

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <button onClick={() => setMode('welcome')} className="absolute -top-12 left-0 text-sub hover:text-main transition-colors flex items-center gap-2 text-sm font-medium">
                    <ArrowUturnLeftIcon className="h-4 w-4"/> Back to Home
                </button>

                <div className="premium-panel p-8 md:p-10 backdrop-blur-xl bg-panel/90 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary mb-4 border border-brand-primary/20">
                            {mode === 'adminSignUp' ? <SparklesIcon className="h-6 w-6"/> : <UserIcon className="h-6 w-6"/>}
                        </div>
                        <h1 className="text-2xl font-bold text-main">{titleText}</h1>
                        <p className="mt-2 text-sm text-sub">{subtitleText}</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
                            <span className="mt-0.5 block w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isAnySignUp && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="firstName" className="text-xs font-medium text-sub ml-1">First Name</label>
                                        <input
                                            id="firstName"
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="input-base"
                                            placeholder="Jane"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="lastName" className="text-xs font-medium text-sub ml-1">Last Name</label>
                                        <input
                                            id="lastName"
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="input-base"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="username" className="text-xs font-medium text-sub ml-1">Username</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-tertiary" />
                                        <input
                                            id="username"
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="input-base pl-10"
                                            placeholder="janedoe"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-medium text-sub ml-1">Email</label>
                            <div className="relative">
                                <MailIcon className="absolute left-3 top-2.5 h-5 w-5 text-tertiary" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-base pl-10"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-medium text-sub ml-1">Password</label>
                            <div className="relative">
                                <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-tertiary" />
                                <input
                                    id="password"
                                    type={isPasswordVisible ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-base pl-10 pr-24"
                                    placeholder="••••••••"
                                />
                                <div className="absolute right-2 top-1.5 flex items-center gap-1">
                                    {isAnySignUp && (
                                        <button
                                            type="button"
                                            onClick={handleSuggestPassword}
                                            className="text-xs font-medium text-brand-primary hover:text-brand-primary-hover px-2 py-1 rounded hover:bg-brand-primary/10 transition-colors"
                                        >
                                            Suggest
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                        className="p-1 text-tertiary hover:text-main transition-colors"
                                    >
                                        {isPasswordVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn btn-primary py-3 mt-2 font-semibold text-base shadow-lg shadow-brand-primary/25"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Processing...
                                </span>
                            ) : (
                                isAnySignUp ? 'Create Account' : 'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-sub">
                        {mode === 'signIn' ? (
                            <p>Don't have an account? <button onClick={() => { setMode('signUp'); setError(null); }} className="text-brand-primary hover:text-brand-primary-hover font-medium ml-1 hover:underline">Sign Up</button></p>
                        ) : (
                            <p>Already have an account? <button onClick={() => { setMode('signIn'); setError(null); }} className="text-brand-primary hover:text-brand-primary-hover font-medium ml-1 hover:underline">Sign In</button></p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
