import {
  signUpWithFirebase,
  signInWithFirebase,
  signOutFirebase,
} from './firebaseAuthService';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn().mockReturnValue([]),
  getApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn().mockReturnValue({}),
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: {
      uid: 'user_123',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      getIdToken: jest.fn().mockResolvedValue('token_123'),
    },
  }),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: {
      uid: 'user_123',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      getIdToken: jest.fn().mockResolvedValue('token_123'),
    },
  }),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  signOut: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn(),
}));

describe('Firebase Authentication Service Unit Tests', () => {
  it('signUpWithFirebase creates user and updates profile name', async () => {
    const result = await signUpWithFirebase('jane@example.com', 'Password123', 'Jane Doe');
    expect(result.user.uid).toBe('user_123');
    expect(result.user.email).toBe('jane@example.com');
  });

  it('signInWithFirebase authenticates user and returns idToken', async () => {
    const session = await signInWithFirebase('jane@example.com', 'Password123');
    expect(session.idToken).toBe('token_123');
    expect(session.user.uid).toBe('user_123');
  });

  it('signOutFirebase signs user out', async () => {
    await expect(signOutFirebase()).resolves.toBeUndefined();
  });
});
