import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  userId: string | null;
  profile: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocked: boolean;
  appLockEnabled: boolean;
  setAppPassword: (password: string, securityQuestion?: string, securityAnswer?: string) => Promise<void>;
  removeAppPassword: () => void;
  verifyAppPassword: (password: string) => Promise<boolean>;
  verifySecurityAnswer: (answer: string) => Promise<boolean>;
  lock: () => void;
  unlock: (password: string) => boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function hashSimple(value: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('dl-locked') === 'true');
  const [appLockEnabled, setAppLockEnabled] = useState(() => !!localStorage.getItem('dl-app-lock-hash'));

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        setProfile({
          userId: s.user.id,
          email: s.user.email,
          fullName: s.user.user_metadata?.full_name || '',
          role: s.user.user_metadata?.role || 'user',
        });
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setProfile({
          userId: s.user.id,
          email: s.user.email,
          fullName: s.user.user_metadata?.full_name || '',
          role: s.user.user_metadata?.role || 'user',
        });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: email === 'fahmanmanka25@gmail.com' ? 'admin' : 'user',
          },
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Registration failed' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      setIsLocked(false);
      localStorage.removeItem('dl-locked');
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Sign in failed' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsLocked(false);
    localStorage.removeItem('dl-locked');
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to send reset email' };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to update password' };
    }
  };

  const lock = () => {
    setIsLocked(true);
    localStorage.setItem('dl-locked', 'true');
  };

  const unlock = (_password: string): boolean => {
    setIsLocked(false);
    localStorage.removeItem('dl-locked');
    return true;
  };

  const setAppPassword = async (password: string, securityQuestion?: string, securityAnswer?: string) => {
    const hash = await hashSimple(password + '-applock');
    localStorage.setItem('dl-app-lock-hash', hash);
    if (securityQuestion && securityAnswer) {
      const ansHash = await hashSimple(securityAnswer.toLowerCase().trim() + '-security');
      localStorage.setItem('dl-security-q', securityQuestion);
      localStorage.setItem('dl-security-a', ansHash);
    }
    setAppLockEnabled(true);
  };

  const removeAppPassword = () => {
    localStorage.removeItem('dl-app-lock-hash');
    localStorage.removeItem('dl-locked');
    localStorage.removeItem('dl-security-q');
    localStorage.removeItem('dl-security-a');
    setIsLocked(false);
    setAppLockEnabled(false);
  };

  const verifySecurityAnswer = async (answer: string): Promise<boolean> => {
    const storedHash = localStorage.getItem('dl-security-a');
    if (!storedHash) return false;
    const ansHash = await hashSimple(answer.toLowerCase().trim() + '-security');
    return ansHash === storedHash;
  };

  const verifyAppPassword = async (password: string): Promise<boolean> => {
    const storedHash = localStorage.getItem('dl-app-lock-hash');
    if (!storedHash) return false;
    const hash = await hashSimple(password + '-applock');
    return hash === storedHash;
  };

  const refreshProfile = () => {
    if (session?.user) {
      setProfile({
        userId: session.user.id,
        email: session.user.email,
        fullName: session.user.user_metadata?.full_name || '',
        role: session.user.user_metadata?.role || 'user',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userId: session?.user?.id ?? null,
        profile: profile ?? null,
        isAuthenticated: !!session,
        isLoading,
        isLocked,
        appLockEnabled,
        setAppPassword,
        removeAppPassword,
        verifyAppPassword,
        verifySecurityAnswer,
        lock,
        unlock,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
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
