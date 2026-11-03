import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dbHelpers } from '../db';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  /** Rename the user everywhere, including the stored resume, so letters match. */
  updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo accounts. Their stored name is only a placeholder: the name parsed from an
// uploaded resume always wins, so the app never greets someone by a demo name.
const DEMO_USERS = [
  { email: 'kiran@example.com', password: 'demo123', name: 'Kiran Prem' },
  { email: 'demo@example.com', password: 'demo', name: 'Demo User' }
];

const STORAGE_KEY = 'jobpilot_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load the saved session, then let the resume supply the real name.
  useEffect(() => {
    let cancelled = false;
    let stored: User | null = null;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        stored = JSON.parse(raw) as User;
        setUser(stored);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    dbHelpers
      .getResume()
      .then((resume) => {
        if (cancelled) return;
        const resumeName = (resume?.parsedData?.name || '').trim();
        if (!resumeName) return;
        setUser((prev) => {
          const base = prev ?? stored;
          if (!base || base.name === resumeName) return prev;
          return { ...base, name: resumeName };
        });
      })
      .catch(() => {
        /* no stored resume yet - keep the account name */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the session in sync with whatever name we are actually showing.
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password);
    if (demoUser) {
      setUser({ email: demoUser.email, name: demoUser.name });
      return true;
    }

    const registeredUsers = JSON.parse(localStorage.getItem('jobpilot_registered_users') || '[]');
    const registeredUser = registeredUsers.find((u: any) => u.email === email && u.password === password);
    if (registeredUser) {
      setUser({ email: registeredUser.email, name: registeredUser.name });
      return true;
    }

    return false;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    const registeredUsers = JSON.parse(localStorage.getItem('jobpilot_registered_users') || '[]');
    if (registeredUsers.some((u: any) => u.email === email)) {
      return false;
    }

    registeredUsers.push({ email, password, name });
    localStorage.setItem('jobpilot_registered_users', JSON.stringify(registeredUsers));
    setUser({ email, name });
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setUser((prev) => (prev ? { ...prev, name: trimmed } : prev));

    try {
      const registeredUsers = JSON.parse(localStorage.getItem('jobpilot_registered_users') || '[]');
      const nextUsers = registeredUsers.map((u: any) =>
        user && u.email === user.email ? { ...u, name: trimmed } : u
      );
      localStorage.setItem('jobpilot_registered_users', JSON.stringify(nextUsers));

      const resume = await dbHelpers.getResume();
      if (resume?.id) {
        await dbHelpers.updateResumeParsedData(resume.id, { ...resume.parsedData, name: trimmed });
      }
    } catch (e) {
      console.warn('Could not save the corrected name:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, isAuthenticated: !!user, updateName }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
