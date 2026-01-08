'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, AuthContextType } from '../lib/auth';
import { User } from '../lib/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (auth.isAuthenticated()) {
        const userData = await auth.getMe();
        setUser(userData);
      }
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);
  
  const login = async (email: string, password: string) => {
    const result = await auth.login(email, password);
    if (result.success) {
      const userData = await auth.getMe();
      setUser(userData);
    }
    return result;
  };
  
  const register = async (email: string, password: string) => {
    const result = await auth.register(email, password);
    if (result.success) {
      const userData = await auth.getMe();
      setUser(userData);
    }
    return result;
  };
  
  const logout = () => {
    auth.logout();
    setUser(null);
  };
  
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: auth.isAuthenticated(),
    isAdmin: auth.isAdmin(),
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};