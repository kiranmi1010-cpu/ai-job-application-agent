import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple demo users (in production, this would be a real backend)
const DEMO_USERS = [
  { email: 'kiran@example.com', password: 'demo123', name: 'Kiran Prem' },
  { email: 'demo@example.com', password: 'demo', name: 'Demo User' }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('jobpilot_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('jobpilot_user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Check demo users
    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
    
    if (demoUser) {
      const userData = { email: demoUser.email, name: demoUser.name };
      setUser(userData);
      localStorage.setItem('jobpilot_user', JSON.stringify(userData));
      return true;
    }

    // Check if user exists in localStorage (registered users)
    const registeredUsers = JSON.parse(localStorage.getItem('jobpilot_registered_users') || '[]');
    const registeredUser = registeredUsers.find((u: any) => u.email === email && u.password === password);
    
    if (registeredUser) {
      const userData = { email: registeredUser.email, name: registeredUser.name };
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
    const userData = { email, name };
    setUser(userData);
    localStorage.setItem('jobpilot_user', JSON.stringify(userData));
    return true;
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
