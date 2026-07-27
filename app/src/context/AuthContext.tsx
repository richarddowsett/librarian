import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, emailAuthSchema } from '../schemas/auth';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  magicLinkSentTo: string | null;
  loginWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithBypass: (customName?: string) => void;
  completeMagicLinkLogin: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_DEMO_USER: UserProfile = {
  uid: 'dev-user-12345',
  email: 'demo-collector@librarian.app',
  displayName: 'Demo Book Collector',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  isDevBypass: true,
  createdAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(DEV_DEMO_USER); // Default logged in for rapid dev review, easily toggled
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);

  const loginWithMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const parseResult = emailAuthSchema.safeParse({ email });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid email address',
      };
    }

    setIsLoading(true);
    try {
      // Simulate sending magic link (or dispatch via Firebase in production)
      await new Promise((resolve) => setTimeout(resolve, 800));
      setMagicLinkSentTo(email);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Failed to send magic link' };
    }
  };

  const completeMagicLinkLogin = (email: string) => {
    const newUser: UserProfile = {
      uid: 'user-' + Date.now(),
      email,
      displayName: email.split('@')[0],
      isDevBypass: false,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    setMagicLinkSentTo(null);
  };

  const loginWithBypass = (customName?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({
        ...DEV_DEMO_USER,
        displayName: customName || DEV_DEMO_USER.displayName,
      });
      setIsLoading(false);
    }, 200);
  };

  const logout = () => {
    setUser(null);
    setMagicLinkSentTo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        magicLinkSentTo,
        loginWithMagicLink,
        loginWithBypass,
        completeMagicLinkLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
