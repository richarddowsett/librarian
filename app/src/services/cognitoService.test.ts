import {
  signUpWithCognito,
  confirmCognitoSignUp,
  resendCognitoConfirmationCode,
  signInWithCognito,
} from './cognitoService';

describe('Cognito Service Unit Tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('signUpWithCognito calls SignUp endpoint with name and email attributes', async () => {
    const mockResponse = {
      UserSub: 'sub-123456',
      CodeDeliveryDetails: { Destination: 'j***@example.com' },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await signUpWithCognito('jane@example.com', 'Password123', 'Jane Doe');

    expect(result.userSub).toBe('sub-123456');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('cognito-idp'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
        }),
        body: expect.stringContaining('Jane Doe'),
      })
    );
  });

  it('confirmCognitoSignUp sends verification code to ConfirmSignUp endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await confirmCognitoSignUp('jane@example.com', '654321');

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('cognito-idp'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
        }),
        body: expect.stringContaining('654321'),
      })
    );
  });

  it('signInWithCognito calls InitiateAuth and GetUser to return auth session', async () => {
    const mockAuthResponse = {
      AuthenticationResult: {
        IdToken: 'id-token-abc',
        AccessToken: 'access-token-xyz',
        RefreshToken: 'refresh-token-123',
      },
    };

    const mockGetUserResponse = {
      Username: 'sub-123456',
      UserAttributes: [
        { Name: 'sub', Value: 'sub-123456' },
        { Name: 'email', Value: 'jane@example.com' },
        { Name: 'name', Value: 'Jane Doe' },
      ],
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGetUserResponse,
      } as Response);

    const session = await signInWithCognito('jane@example.com', 'Password123');

    expect(session.idToken).toBe('id-token-abc');
    expect(session.user.uid).toBe('sub-123456');
    expect(session.user.displayName).toBe('Jane Doe');
    expect(session.user.email).toBe('jane@example.com');
  });

  it('throws error when Cognito API returns non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        __type: 'NotAuthorizedException',
        message: 'Incorrect username or password.',
      }),
    } as Response);

    await expect(signInWithCognito('jane@example.com', 'wrongpassword')).rejects.toThrow(
      'NotAuthorizedException: Incorrect username or password.'
    );
  });
});
