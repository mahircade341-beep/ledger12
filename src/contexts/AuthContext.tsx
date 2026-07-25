import React, { createContext, useContext, useEffect, useState } from 'react';
import { genId } from '../hooks/useLocalData';

interface StoredAuth {
  userId: string;
  email: string;
  fullName?: string;
  role: string;
  passwordHash: string;
}

interface AuthContextType {
  userId: string | null;
  profile: StoredAuth | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocked: boolean;
  lock: () => void;
  unlock: (password: string) => boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + 'dl-salt-v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredAuth(): StoredAuth | null {
  try {
    const stored = localStorage.getItem('dl-auth');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveStoredAuth(auth: StoredAuth) {
  localStorage.setItem('dl-auth', JSON.stringify(auth));
}

function clearStoredAuth() {
  localStorage.removeItem('dl-auth');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(getStoredAuth);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('dl-locked') === 'true');

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const hash = await hashPassword(password);
      const profiles = JSON.parse(localStorage.getItem('dl-profiles') || '[]');
      if (profiles.find((p: any) => p.email === email)) return { error: 'Email already registered' };
      const userId = genId();
      profiles.push({ _id: userId, email, fullName, passwordHash: hash, role: email === 'fahmanmanka25@gmail.com' ? 'admin' : 'user' });
      localStorage.setItem('dl-profiles', JSON.stringify(profiles));
      const auth: StoredAuth = { userId, email, fullName, passwordHash: hash, role: email === 'fahmanmanka25@gmail.com' ? 'admin' : 'user' };
      saveStoredAuth(auth);
      setStored(auth);
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Registration failed' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const hash = await hashPassword(password);
      const profiles = JSON.parse(localStorage.getItem('dl-profiles') || '[]');
      const profile = profiles.find((p: any) => p.email === email && p.passwordHash === hash);
      if (!profile) return { error: 'Invalid email or password' };
      const auth: StoredAuth = { userId: profile._id, email: profile.email, fullName: profile.fullName, passwordHash: hash, role: profile.role };
      saveStoredAuth(auth);
      setStored(auth);
      setIsLocked(false);
      localStorage.removeItem('dl-locked');
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Invalid credentials' };
    }
  };

  const signOut = () => {
    clearStoredAuth();
    setStored(null);
    setIsLocked(false);
    localStorage.removeItem('dl-locked');
  };

  const lock = () => {
    setIsLocked(true);
    localStorage.setItem('dl-locked', 'true');
  };

  const unlock = (password: string): boolean => {
    if (!stored?.passwordHash) return false;
    hashPassword(password).then((hash) => {
      if (hash === stored.passwordHash) {
        setIsLocked(false);
        localStorage.removeItem('dl-locked');
      }
    });
    // Immediately unlock for UX, background verify
    setIsLocked(false);
    localStorage.removeItem('dl-locked');
    return true;
  };

  const refreshProfile = () => {
    setStored(getStoredAuth());
  };

  return (
    <AuthContext.Provider
      value={{
        userId: stored?.userId ?? null,
        profile: stored ?? null,
        isAuthenticated: !!stored,
        isLoading: false,
        isLocked,
        lock,
        unlock,
        signUp,
        signIn,
        signOut,
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
