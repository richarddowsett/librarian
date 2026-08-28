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

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signIn, signUp, isLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    const res = await signIn(email.trim(), password);
    if (res.success) {
      router.replace('/(tabs)');
    } else {
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
      router.replace('/(tabs)');
    } else {
      setErrorMessage(res.error || 'Sign up failed.');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          alignSelf: 'center',
          backgroundColor: '#1e293b',
          borderRadius: 20,
          padding: 28,
          borderWidth: 1,
          borderColor: '#334155',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {/* App Branding */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#0284c7',
            }}
          >
            <Ionicons name="library" size={32} color="#38bdf8" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#f8fafc', letterSpacing: 0.5, includeFontPadding: false }}>
            Shelfd
          </Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center', includeFontPadding: false }}>
            Your Personal Library & Series Companion
          </Text>
        </View>

        {/* Tab Selector: Sign In vs Sign Up */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#0f172a',
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
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
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: mode === 'signin' ? '#0284c7' : 'transparent',
            }}
          >
            <Text
              style={{
                color: mode === 'signin' ? '#ffffff' : '#94a3b8',
                fontWeight: '700',
                fontSize: 14,
                includeFontPadding: false,
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
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: mode === 'signup' ? '#0284c7' : 'transparent',
            }}
          >
            <Text
              style={{
                color: mode === 'signup' ? '#ffffff' : '#94a3b8',
                fontWeight: '700',
                fontSize: 14,
                includeFontPadding: false,
              }}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMessage && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 1,
              borderColor: '#ef4444',
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="alert-circle" size={20} color="#f87171" />
            <Text style={{ color: '#f87171', fontSize: 13, flex: 1, fontWeight: '500', includeFontPadding: false }}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Info / Success Banner */}
        {infoMessage && (
          <View
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderWidth: 1,
              borderColor: '#10b981',
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#34d399" />
            <Text style={{ color: '#34d399', fontSize: 13, flex: 1, fontWeight: '500', includeFontPadding: false }}>
              {infoMessage}
            </Text>
          </View>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'signin' && (
          <View>
            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6, includeFontPadding: false }}>
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 16,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6, includeFontPadding: false }}>
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
                paddingVertical: 12,
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
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', includeFontPadding: false }}>
                    Sign In
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* MODE: CREATE ACCOUNT */}
        {mode === 'signup' && (
          <View>
            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6, includeFontPadding: false }}>
              Full Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor="#64748b"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 16,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6, includeFontPadding: false }}>
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 16,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6, includeFontPadding: false }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 chars (1 uppercase, 1 number)"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 16,
              }}
            />

            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6, includeFontPadding: false }}>
              Confirm Password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor="#64748b"
              secureTextEntry
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
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
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', includeFontPadding: false }}>
                    Create Account
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
