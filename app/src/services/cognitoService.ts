import {
  signUpWithFirebase,
  signInWithFirebase,
  signOutFirebase,
  AuthSessionUser,
} from './firebaseAuthService';

export interface CognitoAuthSession {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
  };
}

export async function signUpWithCognito(email: string, password: string, name?: string) {
  const result = await signUpWithFirebase(email, password, name);
  return { userSub: result.user.uid };
}

export async function confirmCognitoSignUp(email: string, confirmationCode: string) {
  return true;
}

export async function resendCognitoConfirmationCode(email: string) {
  return true;
}

export async function signInWithCognito(email: string, password: string): Promise<CognitoAuthSession> {
  const result = await signInWithFirebase(email, password);
  return {
    idToken: result.idToken,
    accessToken: result.idToken,
    refreshToken: result.idToken,
    user: result.user,
  };
}
