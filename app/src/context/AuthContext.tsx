import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, cognitoSignUpSchema, cognitoConfirmSchema } from '../schemas/auth';
import {
  signUpWithCognito,
  confirmCognitoSignUp,
  resendCognitoConfirmationCode,
  signInWithCognito,
} from '../services/cognitoService';

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
  loginWithBypass: (customName?: string) => void;
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

const AUTH_STORAGE_KEY = 'librarian_auth_session_v1';

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
    const parseResult = cognitoSignUpSchema.safeParse({ email, password, name });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid input details',
      };
    }

    setIsLoading(true);
    try {
      await signUpWithCognito(email, password, name);
      setUnconfirmedEmail(email);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Failed to sign up with AWS Cognito' };
    }
  };

  const confirmSignUp = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    const parseResult = cognitoConfirmSchema.safeParse({ email, code });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid verification code format',
      };
    }

    setIsLoading(true);
    try {
      await confirmCognitoSignUp(email, code);
      setUnconfirmedEmail(null);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Failed to confirm account verification code' };
    }
  };

  const resendCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      await resendCognitoConfirmationCode(email);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Failed to resend confirmation code' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    setIsLoading(true);
    try {
      const session = await signInWithCognito(email, password);
      const profile: UserProfile = {
        uid: session.user.uid,
        email: session.user.email,
        displayName: session.user.displayName,
        idToken: session.idToken,
        accessToken: session.accessToken,
        isDevBypass: false,
        createdAt: new Date().toISOString(),
      };

      saveSession(profile, session.idToken);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      if (err.message && err.message.includes('UserNotConfirmedException')) {
        setUnconfirmedEmail(email);
        return { success: false, error: 'User is not confirmed yet. Please verify your email code.' };
      }
      return { success: false, error: err.message || 'Sign in failed' };
    }
  };

  const loginWithBypass = (customName?: string) => {
    setIsLoading(true);
    const demoProfile: UserProfile = {
      ...DEV_DEMO_USER,
      displayName: customName || DEV_DEMO_USER.displayName,
    };
    saveSession(demoProfile, 'dev-bypass-token-123');
    setIsLoading(false);
  };

  const logout = () => {
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
        loginWithBypass,
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
