import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, signUpSchema, confirmSchema } from '../schemas/auth';
import {
  signUpWithFirebase,
  signInWithFirebase,
  signOutFirebase,
} from '../services/firebaseAuthService';

interface AuthContextType {
  user: UserProfile | null;
  authToken: string | null;
  isLoading: boolean;
  unconfirmedEmail: string | null;
  setUnconfirmedEmail: (email: string | null) => void;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  confirmSignUp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'shelfd_auth_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  // Restore saved session on startup if present
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.user && parsed.authToken) {
            setUser(parsed.user);
            setAuthToken(parsed.authToken);
          }
        }
      }
    } catch (e) {
      console.warn('Could not restore auth session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (profile: UserProfile | null, token: string | null) => {
    setUser(profile);
    setAuthToken(token);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (profile && token) {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: profile, authToken: token }));
        } else {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to save auth session:', e);
    }
  };

  const signUp = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    const parseResult = signUpSchema.safeParse({ email, password, name });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid input details',
      };
    }

    setIsLoading(true);
    try {
      const res = await signUpWithFirebase(email, password, name);
      const profile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
        idToken: res.idToken,
        accessToken: res.idToken,
        createdAt: new Date().toISOString(),
      };
      saveSession(profile, res.idToken);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Failed to sign up with Firebase Authentication' };
    }
  };

  const confirmSignUp = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    const parseResult = confirmSchema.safeParse({ email, code });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid verification code format',
      };
    }

    setIsLoading(true);
    setUnconfirmedEmail(null);
    setIsLoading(false);
    return { success: true };
  };

  const resendCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setIsLoading(false);
    return { success: true };
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    setIsLoading(true);
    try {
      const session = await signInWithFirebase(email, password);
      const profile: UserProfile = {
        uid: session.user.uid,
        email: session.user.email,
        displayName: session.user.displayName,
        idToken: session.idToken,
        accessToken: session.idToken,
        createdAt: new Date().toISOString(),
      };

      saveSession(profile, session.idToken);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Sign in failed' };
    }
  };

  const logout = () => {
    signOutFirebase().catch((err) => console.warn('Logout error:', err));
    saveSession(null, null);
    setUnconfirmedEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authToken,
        isLoading,
        unconfirmedEmail,
        setUnconfirmedEmail,
        signUp,
        confirmSignUp,
        resendCode,
        signIn,
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
