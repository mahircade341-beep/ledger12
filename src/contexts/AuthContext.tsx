import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  userId: string;
  email: string;
  fullName: string;
  storeName: string;
  role: string;
}

interface AuthContextType {
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: Profile | null;
  storeName: string;

  // Sign up / sign in
  signUp: (email: string, password: string, fullName: string, storeName: string) => Promise<{ error?: string; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;

  // Google OAuth
  signInWithGoogle: () => Promise<void>;

  // Password reset
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;

  // App lock (secondary layer)
  isLocked: boolean;
  appLockEnabled: boolean;
  setAppPassword: (password: string, securityQuestion?: string, securityAnswer?: string) => Promise<void>;
  removeAppPassword: () => void;
  verifyAppPassword: (password: string) => Promise<boolean>;
  verifySecurityAnswer: (answer: string) => Promise<boolean>;
  lock: () => void;
  unlock: (password: string) => boolean;

  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function hashSimple(value: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function setItem(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}

function removeItem(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // App lock state
  const [isLocked, setIsLocked] = useState(() => getItem('dl-locked') === 'true');
  const [appLockEnabled, setAppLockEnabled] = useState(() => !!getItem('dl-app-lock-hash'));

  const storeName = profile?.storeName || localStorage.getItem('dl-store-name') || 'DukaHub';

  // Fetch user profile from supabase
  const refreshProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;
    setUser(currentUser);
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
    if (prof) {
      const p: Profile = {
        userId: currentUser.id,
        email: currentUser.email || '',
        fullName: prof.full_name || '',
        storeName: prof.store_name || '',
        role: prof.role || 'user',
      };
      setProfile(p);
      if (prof.store_name) localStorage.setItem('dl-store-name', prof.store_name);
    }
  };

  // Initialize auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    }).finally(() => setIsLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await refreshProfile();
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Auth Methods ──────────────────────────────

  const signUp = async (email: string, password: string, fullName: string, storeName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, store_name: storeName, role: 'user' },
      },
    });
    if (error) return { error: error.message };
    return { data };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await refreshProfile();
    return {};
  };

  const signOut = async () => {
    removeItem('dl-store-name');
    setIsLocked(false);
    removeItem('dl-locked');

    // Sign out from Supabase
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return {};
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return {};
  };

  // ─── Google OAuth ──────────────────────────────

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/pos`,
      },
    });
    if (error) console.error('Google sign-in error:', error.message);
  };

  // ─── App Lock ──────────────────────────────────

  const setAppPassword = async (password: string, securityQuestion?: string, securityAnswer?: string) => {
    const hash = await hashSimple(password + '-applock');
    setItem('dl-app-lock-hash', hash);
    if (securityQuestion && securityAnswer) {
      const ansHash = await hashSimple(securityAnswer.toLowerCase().trim() + '-security');
      setItem('dl-security-q', securityQuestion);
      setItem('dl-security-a', ansHash);
    }
    setAppLockEnabled(true);
  };

  const removeAppPassword = () => {
    removeItem('dl-app-lock-hash');
    removeItem('dl-locked');
    setIsLocked(false);
    setAppLockEnabled(false);
  };

  const verifyAppPassword = async (password: string): Promise<boolean> => {
    const storedHash = getItem('dl-app-lock-hash');
    if (!storedHash) return false;
    const hash = await hashSimple(password + '-applock');
    return hash === storedHash;
  };

  const verifySecurityAnswer = async (answer: string): Promise<boolean> => {
    const storedHash = getItem('dl-security-a');
    if (!storedHash) return false;
    const ansHash = await hashSimple(answer.toLowerCase().trim() + '-security');
    return ansHash === storedHash;
  };

  const lock = () => {
    setIsLocked(true);
    setItem('dl-locked', 'true');
  };

  const unlock = (_password: string): boolean => {
    setIsLocked(false);
    removeItem('dl-locked');
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        userId: user?.id || null,
        user,
        isAuthenticated: !!user,
        isLoading,
        profile,
        storeName,

        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        resetPassword,
        updatePassword,

        isLocked,
        appLockEnabled,
        setAppPassword,
        removeAppPassword,
        verifyAppPassword,
        verifySecurityAnswer,
        lock,
        unlock,

        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
