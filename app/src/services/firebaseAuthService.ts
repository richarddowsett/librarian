import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBteiQEUXG_s83BPGknUbh8Kw9d4ygCmis',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'shelfd-506308.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'shelfd-506308',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'shelfd-506308.firebasestorage.app',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export interface AuthSessionUser {
  uid: string;
  email: string;
  displayName: string;
}

export async function signUpWithFirebase(
  email: string,
  password: string,
  name?: string
): Promise<{ user: AuthSessionUser; idToken: string }> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name && cred.user) {
    await updateProfile(cred.user, { displayName: name });
  }
  const idToken = await cred.user.getIdToken();
  return {
    user: {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: name || cred.user.displayName || email.split('@')[0],
    },
    idToken,
  };
}

export async function signInWithFirebase(
  email: string,
  password: string
): Promise<{ user: AuthSessionUser; idToken: string }> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();
  return {
    user: {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: cred.user.displayName || (cred.user.email || email).split('@')[0],
    },
    idToken,
  };
}

export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthStateChangedListener(callback: (user: AuthSessionUser | null) => void) {
  return firebaseOnAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      callback({
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || (fbUser.email || '').split('@')[0],
      });
    } else {
      callback(null);
    }
  });
}
