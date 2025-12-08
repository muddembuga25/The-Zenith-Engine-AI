import type { User } from '../../types';

const USERS_KEY = 'zenith-engine-ai-users';
const CURRENT_USER_KEY = 'zenith-engine-ai-current-user';
const IMPERSONATION_KEY = 'zenith-engine-ai-impersonation';

const getUsers = (): User[] => {
    const usersJson = localStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const signIn = async (email: string, password: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Sim delay
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // In a real app, verify password hash.
    if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
    }
    throw new Error('Invalid email or password');
};

export const signUp = async (email: string, password: string, username: string, firstName: string, lastName: string, plan: any, cycle: any, isAdmin: boolean = false): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('User already exists');
    }

    const newUser: User = {
        uid: crypto.randomUUID(),
        email,
        username,
        firstName,
        lastName,
        isAdmin,
        subscriptionPlan: plan || 'free',
        subscriptionCycle: cycle || 'monthly',
        monthlyGenerations: { count: 0, resetDate: Date.now() },
        trialEndsAt: isAdmin ? undefined : Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 day trial
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return newUser;
};

export const signInWithGoogle = async (): Promise<User> => {
    // Mock Google Sign In
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockUser: User = {
        uid: 'google-user-' + crypto.randomUUID(),
        email: `user-${Date.now()}@gmail.com`,
        username: 'Google User',
        firstName: 'Google',
        lastName: 'User',
        subscriptionPlan: 'free',
        monthlyGenerations: { count: 0, resetDate: Date.now() },
        trialEndsAt: Date.now() + 14 * 24 * 60 * 60 * 1000
    };
    
    const users = getUsers();
    users.push(mockUser);
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mockUser));
    return mockUser;
};

export const signOut = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(IMPERSONATION_KEY);
};

export const getCurrentUser = (): { user: User | null; impersonatingAdmin: User | null } => {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    const impersonationJson = localStorage.getItem(IMPERSONATION_KEY);
    
    return {
        user: userJson ? JSON.parse(userJson) : null,
        impersonatingAdmin: impersonationJson ? JSON.parse(impersonationJson) : null
    };
};

export const hasAdmin = async (): Promise<boolean> => {
    const users = getUsers();
    return users.some(u => u.isAdmin);
};

export const getAllUsers = async (): Promise<User[]> => {
    return getUsers();
};

export const updateUser = async (email: string, updates: Partial<User>): Promise<User> => {
    const users = getUsers();
    const index = users.findIndex(u => u.email === email);
    if (index === -1) throw new Error('User not found');
    
    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    saveUsers(users);
    
    const currentUser = getCurrentUser().user;
    if (currentUser && currentUser.email === email) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
    
    return updatedUser;
};

export const deleteUser = (email: string) => {
    let users = getUsers();
    users = users.filter(u => u.email !== email);
    saveUsers(users);
};

export const impersonateUser = (userToImpersonate: User, adminUser: User) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToImpersonate));
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(adminUser));
};

export const endImpersonation = (): User | null => {
    const adminUserJson = localStorage.getItem(IMPERSONATION_KEY);
    if (adminUserJson) {
        localStorage.setItem(CURRENT_USER_KEY, adminUserJson);
        localStorage.removeItem(IMPERSONATION_KEY);
        return JSON.parse(adminUserJson);
    }
    return null;
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<User> => {
    const users = getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error('User not found');
    
    const updatedUser = { ...users[index], ...data };
    users[index] = updatedUser;
    saveUsers(users);
    
    const currentUser = getCurrentUser().user;
    if (currentUser && currentUser.uid === uid) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
    return updatedUser;
};

export const changePassword = async (current: string, newPass: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return; 
};