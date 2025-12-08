
import { supabase } from './supabaseClient';
import type { User } from '../types';

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
        console.warn("Profile fetch failed, using default profile structure:", profileError);
        return mapSupabaseUserToAppUser(data.user, {});
    }

    return mapSupabaseUserToAppUser(data.user, profile);
};

export const signUp = async (email: string, password: string, username: string, firstName: string, lastName: string, plan: any, cycle: any, isAdmin: boolean = false): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username, first_name: firstName, last_name: lastName }
        }
    });

    if (error) throw error;
    if (!data.user) throw new Error("SignUp successful but no user returned. Please check your email for a confirmation link if required.");

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
    
    // Ignore error if profile already exists (handle duplicate key race conditions)
    if (insertError && !insertError.message.includes('duplicate key')) {
        console.error("Failed to create profile:", insertError);
    }

    return mapSupabaseUserToAppUser(data.user, newProfile);
};

export const signInWithGoogle = async (): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    if (error) throw error;
    
    // This will redirect the page, so we technically never reach here in a successful flow
    throw new Error("Redirecting to Google..."); 
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
    
    // Clear any local impersonation state
    localStorage.removeItem('zenith_impersonated_user');
};

export const getCurrentUser = async (): Promise<{ user: User | null; impersonatingAdmin: User | null }> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
        console.error("Session check error:", sessionError);
        return { user: null, impersonatingAdmin: null };
    }

    if (session?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        const user = mapSupabaseUserToAppUser(session.user, profile || {});
        
        // Handle impersonation
        const impersonatedUserJson = localStorage.getItem('zenith_impersonated_user');
        if (user.isAdmin && impersonatedUserJson) {
            try {
                const impersonatedUser = JSON.parse(impersonatedUserJson);
                return { user: impersonatedUser, impersonatingAdmin: user };
            } catch (e) {
                console.error("Failed to parse impersonated user:", e);
                localStorage.removeItem('zenith_impersonated_user');
            }
        }

        return { user, impersonatingAdmin: null };
    }

    return { user: null, impersonatingAdmin: null };
};

export const hasAdmin = async (): Promise<boolean> => {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', true);
    
    if (error) {
        console.warn("Failed to check for admin:", error);
        return false;
    }
    return (count || 0) > 0;
};

export const getAllUsers = async (): Promise<User[]> => {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    if (!profiles) return [];
    
    return profiles.map(p => ({
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
};

export const updateUser = async (email: string, updates: Partial<User>): Promise<User> => {
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
    
    if (!profile) throw new Error("User not found.");

    const dbUpdates: any = {};
    if (updates.subscriptionPlan) dbUpdates.subscription_plan = updates.subscriptionPlan;
    if (updates.subscriptionCycle) dbUpdates.subscription_cycle = updates.subscriptionCycle;
    if (updates.monthlyGenerations) dbUpdates.monthly_generations = updates.monthlyGenerations;
    if (updates.trialEndsAt !== undefined) dbUpdates.trial_ends_at = updates.trialEndsAt;

    const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', profile.id)
        .select()
        .single();

    if (error) throw error;
    
    return {
        uid: updatedProfile.id,
        email: updatedProfile.email,
        username: updatedProfile.username,
        firstName: updatedProfile.first_name,
        lastName: updatedProfile.last_name,
        isAdmin: updatedProfile.is_admin,
        subscriptionPlan: updatedProfile.subscription_plan,
        subscriptionCycle: updatedProfile.subscription_cycle,
        monthlyGenerations: updatedProfile.monthly_generations,
        trialEndsAt: updatedProfile.trial_ends_at
    } as User;
};

export const deleteUser = async (email: string) => {
    const { error } = await supabase.from('profiles').delete().eq('email', email);
    if (error) throw error;
};

export const impersonateUser = (userToImpersonate: User, adminUser: User) => {
    localStorage.setItem('zenith_impersonated_user', JSON.stringify(userToImpersonate));
};

export const endImpersonation = (): User | null => {
    localStorage.removeItem('zenith_impersonated_user');
    return null;
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
    const dbUpdates: any = {};
    if (data.firstName) dbUpdates.first_name = data.firstName;
    if (data.lastName) dbUpdates.last_name = data.lastName;
    if (data.username) dbUpdates.username = data.username;

    const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', uid)
        .select()
        .single();

    if (error) throw error;
    
    return {
        ...data,
        uid: updatedProfile.id,
        email: updatedProfile.email,
        firstName: updatedProfile.first_name,
        lastName: updatedProfile.last_name,
        username: updatedProfile.username
    } as User;
};

export const changePassword = async (current: string, newPass: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
};
