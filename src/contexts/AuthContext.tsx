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
  updateName: (name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple demo users (in production, this would be a real backend)
const DEMO_USERS = [
  { email: 'kiran@example.com', password: 'demo123', name: 'Kiran' },
  { email: 'demo@example.com', password: 'demo', name: 'Demo User' }
];

/**
 * The account name is only a fallback: the resume is the source of truth for
 * who the candidate is, and cover letters are signed with the resume name.
 * Without this the header showed a placeholder signup name ("Kiran Prem")
 * while every letter was signed with the real name from the resume.
 */
async function resolveName(userData: User): Promise<User> {
  try {
    const resume = await dbHelpers.getResume();
    const parsedName = String(resume?.parsedData?.name || '').trim();
    if (parsedName && !/^(unknown|your name|resume)$/i.test(parsedName) && parsedName.length > 1) {
      const merged = { ...userData, name: parsedName };
      localStorage.setItem('jobpilot_user', JSON.stringify(merged));
      return merged;
    }
  } catch (error) {
    console.warn('Could not read the resume name:', error);
  }
  return userData;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount, then prefer the resume's name.
  useEffect(() => {
    const storedUser = localStorage.getItem('jobpilot_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        resolveName(parsed).then(setUser);
      } catch (e) {
        localStorage.removeItem('jobpilot_user');
      }
      return;
    }

    // Signed in before a resume existed? Pick the name up once one is uploaded.
    dbHelpers
      .getResume()
      .then((resume) => {
        const parsedName = String(resume?.parsedData?.name || '').trim();
        if (!parsedName) return;
        const current = localStorage.getItem('jobpilot_user');
        if (current) return;
        setUser((existing) => (existing ? existing : null));
      })
      .catch(() => undefined);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Check demo users
    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (demoUser) {
      const userData = await resolveName({ email: demoUser.email, name: demoUser.name });
      setUser(userData);
      localStorage.setItem('jobpilot_user', JSON.stringify(userData));
      return true;
    }

    // Check if user exists in localStorage (registered users)
    const registeredUsers = JSON.parse(localStorage.getItem('jobpilot_registered_users') || '[]');
    const registeredUser = registeredUsers.find((u: any) => u.email === email && u.password === password);

    if (registeredUser) {
      const userData = await resolveName({ email: registeredUser.email, name: registeredUser.name });
      setUser(userData);
      localStorage.setItem('jobpilot_user', JSON.stringify(userData));
      return true;
    }

    return false;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    // Check if user already exists
    const registeredUsers = JSON.parse(localStorage.getItem('jobpilot_registered_users') || '[]');
    const exists = registeredUsers.some((u: any) => u.email === email);

    if (exists) {
      return false;
    }

    // Add new user
    const newUser = { email, password, name };
    registeredUsers.push(newUser);
    localStorage.setItem('jobpilot_registered_users', JSON.stringify(registeredUsers));

    // Auto-login
    const userData = await resolveName({ email, name });
    setUser(userData);
    localStorage.setItem('jobpilot_user', JSON.stringify(userData));
    return true;
  };

  /** Lets the candidate correct the name once, everywhere, without a re-upload. */
  const updateName = async (name: string): Promise<void> => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = { ...user, name: trimmed };
    setUser(next);
    localStorage.setItem('jobpilot_user', JSON.stringify(next));

    try {
      const resume = await dbHelpers.getResume();
      if (resume?.id && resume.parsedData) {
        await dbHelpers.updateResumeParsedData(resume.id, {
          ...resume.parsedData,
          name: trimmed,
        });
      }
    } catch (error) {
      console.warn('Could not save the corrected name to the resume:', error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jobpilot_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      updateName,
      logout,
      isAuthenticated: !!user
    }}>
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
