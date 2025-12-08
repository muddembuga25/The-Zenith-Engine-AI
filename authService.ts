
import { supabase } from './supabaseClient';
import type { User } from '../types';

// --- Local Storage Fallback Keys ---
const LOCAL_USERS_KEY = 'zenith_local_users';
const LOCAL_SESSION_KEY = 'zenith_local_session';

// --- Local Storage Helpers ---
const getLocalUsers = (): User[] => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    } catch { return []; }
};

const saveLocalUser = (user: User) => {
    const users = getLocalUsers();
    const index = users.findIndex(u => u.email === user.email);
    if (index >= 0) {
        users[index] = user;
    } else {
        users.push(user);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const setLocalSession = (user: User) => {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
};

const getLocalSession = (): User | null => {
    try {
        const json = localStorage.getItem(LOCAL_SESSION_KEY);
        return json ? JSON.parse(json) : null;
    } catch { return null; }
};

const clearLocalSession = () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    localStorage.removeItem('zenith_impersonated_user');
};

const isNetworkError = (error: any) => {
    const msg = error?.message || '';
    return msg === 'Failed to fetch' || 
           msg.includes('Network Error') ||
           msg.includes('connection to the Supabase') ||
           (error?.cause as any)?.code === 'TypeError'; 
};

// Helper to map Supabase user + Profile to App User
const mapSupabaseUserToAppUser = (sbUser: any, profile: any): User => {
    return {
        uid: sbUser.id,
        email: sbUser.email || '',
        username: profile?.username || sbUser.email?.split('@')[0],
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        profilePictureUrl: sbUser.user_metadata?.avatar_url,
        isAdmin: profile?.is_admin || false,
        subscriptionPlan: profile?.subscription_plan || 'free',
        subscriptionCycle: profile?.subscription_cycle || 'monthly',
        monthlyGenerations: profile?.monthly_generations || { count: 0, resetDate: Date.now() },
        trialEndsAt: profile?.trial_ends_at
    };
};

export const signIn = async (email: string, password: string): Promise<User> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("No user returned from Supabase");

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            // Profile fetch failed but auth succeeded, likely network blip or missing profile
            const user = mapSupabaseUserToAppUser(data.user, {});
            setLocalSession(user);
            saveLocalUser(user);
            return user;
        }

        const user = mapSupabaseUserToAppUser(data.user, profile);
        setLocalSession(user);
        saveLocalUser(user);
        return user;
    } catch (error: any) {
        if (isNetworkError(error)) {
            // Quietly fall back to local storage
            const localUsers = getLocalUsers();
            const localUser = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (localUser) {
                setLocalSession(localUser);
                return localUser;
            }
        }
        throw error;
    }
};

export const signUp = async (email: string, password: string, username: string, firstName: string, lastName: string, plan: any, cycle: any, isAdmin: boolean = false): Promise<User> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username, first_name: firstName, last_name: lastName }
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error("SignUp successful but no user returned.");

        // Create Profile manually
        const newProfile = {
            id: data.user.id,
            email,
            username,
            first_name: firstName,
            last_name: lastName,
            is_admin: isAdmin,
            subscription_plan: isAdmin ? (plan || 'free') : 'agency',
            subscription_cycle: cycle || 'monthly',
            monthly_generations: { count: 0, resetDate: Date.now() },
            trial_ends_at: isAdmin ? null : Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 day trial
        };

        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        
        if (insertError && !insertError.message.includes('duplicate key')) {
            console.error("Failed to create profile:", insertError);
        }

        const user = mapSupabaseUserToAppUser(data.user, newProfile);
        setLocalSession(user);
        saveLocalUser(user);
        return user;
    } catch (error: any) {
        if (isNetworkError(error)) {
            const newUser: User = {
                uid: crypto.randomUUID(),
                email,
                username,
                firstName,
                lastName,
                isAdmin,
                subscriptionPlan: isAdmin ? (plan || 'free') : 'agency',
                subscriptionCycle: cycle || 'monthly',
                monthlyGenerations: { count: 0, resetDate: Date.now() },
                trialEndsAt: isAdmin ? undefined : Date.now() + 7 * 24 * 60 * 60 * 1000
            };
            saveLocalUser(newUser);
            setLocalSession(newUser);
            return newUser;
        }
        throw error;
    }
};

export const signInWithGoogle = async (): Promise<User> => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
        // The user will be redirected to Google, so we won't return immediately.
        // Throwing error to stop loading spinner is a common pattern here or handle state.
        throw new Error("Redirecting to Google..."); 
    } catch (error: any) {
        if (isNetworkError(error)) {
            throw new Error("Offline Mode: Google Sign-In is unavailable. Please use email/password.");
        }
        throw error;
    }
};

export const signOut = async () => {
    try {
        await supabase.auth.signOut();
    } catch {
        // Ignore network errors on signout
    }
    clearLocalSession();
    localStorage.removeItem('zenith_impersonated_user');
};

export const getCurrentUser = (): { user: User | null; impersonatingAdmin: User | null } => {
    // We check local session first for speed and offline support
    const localUser = getLocalSession();
    
    // Check for impersonation
    const impersonatedUserJson = localStorage.getItem('zenith_impersonated_user');
    if (localUser?.isAdmin && impersonatedUserJson) {
        const impersonatedUser = JSON.parse(impersonatedUserJson);
        return { user: impersonatedUser, impersonatingAdmin: localUser };
    }

    return { user: localUser, impersonatingAdmin: null };
};

export const hasAdmin = async (): Promise<boolean> => {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('is_admin', true);
        
        if (error) throw error;
        return (count || 0) > 0;
    } catch {
        const localUsers = getLocalUsers();
        return localUsers.some(u => u.isAdmin);
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const { data: profiles, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        if (!profiles) return [];
        
        const users = profiles.map(p => ({
            uid: p.id,
            email: p.email,
            username: p.username,
            firstName: p.first_name,
            lastName: p.last_name,
            isAdmin: p.is_admin,
            subscriptionPlan: p.subscription_plan,
            subscriptionCycle: p.subscription_cycle,
            monthlyGenerations: p.monthly_generations,
            trialEndsAt: p.trial_ends_at
        }));
        
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        return users;
    } catch {
        return getLocalUsers();
    }
};

export const updateUser = async (email: string, updates: Partial<User>): Promise<User> => {
    // Optimistic local update first
    const localUsers = getLocalUsers();
    const index = localUsers.findIndex(u => u.email === email);
    if (index === -1) throw new Error("User not found");
    
    const updatedUser = { ...localUsers[index], ...updates };
    localUsers[index] = updatedUser;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
    
    const current = getLocalSession();
    if (current && current.email === email) {
        setLocalSession(updatedUser);
    }

    // Try remote update
    try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
        if (profile) {
            const dbUpdates: any = {};
            if (updates.subscriptionPlan) dbUpdates.subscription_plan = updates.subscriptionPlan;
            if (updates.subscriptionCycle) dbUpdates.subscription_cycle = updates.subscriptionCycle;
            if (updates.monthlyGenerations) dbUpdates.monthly_generations = updates.monthlyGenerations;
            if (updates.trialEndsAt !== undefined) dbUpdates.trial_ends_at = updates.trialEndsAt;

            await supabase.from('profiles').update(dbUpdates).eq('id', profile.id);
        }
    } catch (e) {
        // Silent fail on remote update if offline, we have local state
        console.debug("Remote update failed, state saved locally.");
    }

    return updatedUser;
};

export const deleteUser = async (email: string) => {
    const localUsers = getLocalUsers();
    const filtered = localUsers.filter(u => u.email !== email);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));

    try {
        await supabase.from('profiles').delete().eq('email', email);
    } catch {
        // Ignore offline error
    }
};

export const impersonateUser = (userToImpersonate: User, adminUser: User) => {
    localStorage.setItem('zenith_impersonated_user', JSON.stringify(userToImpersonate));
};

export const endImpersonation = (): User | null => {
    localStorage.removeItem('zenith_impersonated_user');
    return null;
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
    // Local Update
    const localUsers = getLocalUsers();
    const index = localUsers.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error("User not found");
    
    const updatedUser = { ...localUsers[index], ...data };
    localUsers[index] = updatedUser;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
    setLocalSession(updatedUser);

    // Remote Update
    try {
        const dbUpdates: any = {};
        if (data.firstName) dbUpdates.first_name = data.firstName;
        if (data.lastName) dbUpdates.last_name = data.lastName;
        if (data.username) dbUpdates.username = data.username;

        await supabase.from('profiles').update(dbUpdates).eq('id', uid);
    } catch (e) {
        console.debug("Remote profile update failed, state saved locally.");
    }
    
    return updatedUser;
};

export const changePassword = async (current: string, newPass: string): Promise<void> => {
    try {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) throw error;
    } catch (e) {
        console.error("Password change failed (offline not supported for auth changes):", e);
        throw e;
    }
};
