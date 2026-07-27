const COGNITO_REGION = process.env.EXPO_PUBLIC_AWS_REGION || 'eu-central-1';
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '1qhr6sp98vcpj6e7qbtbcmjcjr';
const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

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

async function callCognitoApi(target: string, payload: Record<string, any>) {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data.__type
      ? `${data.__type.split('#')[1] || data.__type}: ${data.message || 'Cognito authentication request failed.'}`
      : data.message || 'Cognito authentication error';
    throw new Error(message);
  }

  return data;
}

export async function signUpWithCognito(email: string, password: string): Promise<{ userSub: string; codeDeliveryDetails?: any }> {
  const response = await callCognitoApi('SignUp', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  });

  return {
    userSub: response.UserSub,
    codeDeliveryDetails: response.CodeDeliveryDetails,
  };
}

export async function confirmCognitoSignUp(email: string, confirmationCode: string): Promise<boolean> {
  await callCognitoApi('ConfirmSignUp', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: confirmationCode,
  });

  return true;
}

export async function resendCognitoConfirmationCode(email: string): Promise<boolean> {
  await callCognitoApi('ResendConfirmationCode', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
  });

  return true;
}

export async function signInWithCognito(email: string, password: string): Promise<CognitoAuthSession> {
  const response = await callCognitoApi('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const authResult = response.AuthenticationResult;
  if (!authResult) {
    throw new Error('Authentication failed - no result returned.');
  }

  const userDetails = await callCognitoApi('GetUser', {
    AccessToken: authResult.AccessToken,
  });

  const subAttr = userDetails.UserAttributes?.find((attr: { Name: string; Value: string }) => attr.Name === 'sub');
  const emailAttr = userDetails.UserAttributes?.find((attr: { Name: string; Value: string }) => attr.Name === 'email');

  return {
    idToken: authResult.IdToken,
    accessToken: authResult.AccessToken,
    refreshToken: authResult.RefreshToken,
    user: {
      uid: subAttr?.Value || userDetails.Username || email,
      email: emailAttr?.Value || email,
      displayName: (emailAttr?.Value || email).split('@')[0],
    },
  };
}
