import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Mode = 'signin' | 'signup' | 'confirm';

export default function LoginScreen() {
  const {
    signIn,
    signUp,
    confirmSignUp,
    resendCode,
    loginWithBypass,
    unconfirmedEmail,
    setUnconfirmedEmail,
    isLoading,
  } = useAuth();

  const router = useRouter();
  const [mode, setMode] = useState<Mode>(unconfirmedEmail ? 'confirm' : 'signin');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState(unconfirmedEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    const res = await signIn(email.trim(), password);
    if (res.success) {
      router.replace('/(tabs)');
    } else {
      if (res.error?.includes('not confirmed')) {
        setMode('confirm');
      }
      setErrorMessage(res.error || 'Sign in failed.');
    }
  };

  const handleSignUp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const res = await signUp(email.trim(), password, name.trim());
    if (res.success) {
      setInfoMessage('Account created! Check your email inbox for your 6-digit verification code.');
      setMode('confirm');
    } else {
      setErrorMessage(res.error || 'Sign up failed.');
    }
  };

  const handleConfirmCode = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const targetEmail = unconfirmedEmail || email.trim();
    const res = await confirmSignUp(targetEmail, verificationCode.trim());
    if (res.success) {
      setInfoMessage('Email verified successfully! You can now log in with your credentials.');
      setMode('signin');
      setPassword('');
    } else {
      setErrorMessage(res.error || 'Verification failed. Check code and try again.');
    }
  };

  const handleResendCode = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    const targetEmail = unconfirmedEmail || email.trim();
    const res = await resendCode(targetEmail);
    if (res.success) {
      setInfoMessage(`A fresh verification code was sent to ${targetEmail}.`);
    } else {
      setErrorMessage(res.error || 'Failed to resend verification code.');
    }
  };

  const handleDevBypass = () => {
    loginWithBypass();
    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#1e293b',
          borderRadius: 24,
          padding: 32,
          borderWidth: 1,
          borderColor: '#334155',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        {/* Logo & Application Title */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: '#0284c7',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              shadowColor: '#0284c7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
            }}
          >
            <Ionicons name="library" size={34} color="#ffffff" />
          </View>
          <Text style={{ color: '#f8fafc', fontSize: 26, fontWeight: '800', letterSpacing: 0.5 }}>
            LIBRARIAN
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
            AWS Cognito User Authentication & Library Cloud
          </Text>
        </View>

        {/* Tab Switcher (Sign In vs Sign Up) */}
        {mode !== 'confirm' && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#0f172a',
              borderRadius: 14,
              padding: 4,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setMode('signin');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: mode === 'signin' ? '#0284c7' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: mode === 'signin' ? '#ffffff' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode('signup');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: mode === 'signup' ? '#0284c7' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: mode === 'signup' ? '#ffffff' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info & Error Banner Alerts */}
        {infoMessage && (
          <View
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              borderColor: '#0284c7',
              borderWidth: 1,
              padding: 14,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
              {infoMessage}
            </Text>
          </View>
        )}

        {errorMessage && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: '#ef4444',
              borderWidth: 1,
              padding: 14,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#fca5a5', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'signin' && (
          <View>
            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="reader@example.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 14,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 20,
              }}
            />

            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                    Sign In to Cognito
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* MODE: SIGN UP */}
        {mode === 'signup' && (
          <View>
            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Full Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor="#64748b"
              autoCapitalize="words"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 14,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="reader@example.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 14,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Password (Min 8 chars, 1 uppercase & 1 number)
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 14,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Confirm Password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 20,
              }}
            />

            <TouchableOpacity
              onPress={handleSignUp}
              disabled={isLoading}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                    Create Account & Send Code
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* MODE: CONFIRM VERIFICATION CODE */}
        {mode === 'confirm' && (
          <View>
            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Enter 6-Digit Email Verification Code
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
              Verification code sent to:{' '}
              <Text style={{ color: '#38bdf8', fontWeight: '700' }}>
                {unconfirmedEmail || email}
              </Text>
            </Text>

            <TextInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="123456"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 18,
                fontWeight: '700',
                letterSpacing: 4,
                textAlign: 'center',
                borderWidth: 1,
                borderColor: '#0284c7',
                marginBottom: 16,
              }}
            />

            <TouchableOpacity
              onPress={handleConfirmCode}
              disabled={isLoading}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                    Verify & Activate Account
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 16 }}>
              <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '600' }}>
                  Resend Verification Code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setUnconfirmedEmail(null);
                  setMode('signin');
                }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#334155' }} />
          <Text style={{ color: '#64748b', fontSize: 12, marginHorizontal: 12, fontWeight: '600' }}>
            LOCAL DEV MODE
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#334155' }} />
        </View>

        {/* Instant Dev Bypass */}
        <TouchableOpacity
          onPress={handleDevBypass}
          style={{
            backgroundColor: 'rgba(124, 58, 237, 0.15)',
            borderColor: '#7c3aed',
            borderWidth: 1.5,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Ionicons name="flash" size={18} color="#a78bfa" />
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={{ color: '#ddd6fe', fontSize: 14, fontWeight: '800' }}>
              Instant Demo Bypass Login
            </Text>
            <Text style={{ color: '#a78bfa', fontSize: 11 }}>
              Test locally without creating Cognito credentials
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
