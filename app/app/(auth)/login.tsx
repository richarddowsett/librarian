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

export default function LoginScreen() {
  const {
    loginWithMagicLink,
    loginWithBypass,
    magicLinkSentTo,
    completeMagicLinkLogin,
    isLoading,
  } = useAuth();

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendMagicLink = async () => {
    setErrorMessage(null);
    const result = await loginWithMagicLink(email);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to send magic link');
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
        {/* Logo & Title */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: '#0284c7',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
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
          <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
            Your personal book catalog & series tracker
          </Text>
        </View>

        {magicLinkSentTo ? (
          <View
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderColor: '#0284c7',
              borderWidth: 1,
              padding: 20,
              borderRadius: 16,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Ionicons name="mail-open-outline" size={48} color="#38bdf8" />
            <Text
              style={{
                color: '#f8fafc',
                fontSize: 16,
                fontWeight: '700',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              Magic Link Dispatched!
            </Text>
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 13,
                textAlign: 'center',
                marginTop: 6,
                marginBottom: 16,
              }}
            >
              We sent a passwordless sign-in link to{' '}
              <Text style={{ color: '#38bdf8', fontWeight: '700' }}>{magicLinkSentTo}</Text>. Check your inbox!
            </Text>

            <TouchableOpacity
              onPress={() => {
                completeMagicLinkLogin(magicLinkSentTo);
                router.replace('/(tabs)');
              }}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 12,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                Simulate Clicking Magic Link
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Passwordless Email Form */
          <View>
            <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
              Passwordless Sign-In with Email
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
                marginBottom: 16,
              }}
            />

            {errorMessage && (
              <Text style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
                {errorMessage}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleSendMagicLink}
              disabled={isLoading}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginBottom: 20,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="send-sharp" size={18} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                    Send Magic Link
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#334155' }} />
          <Text style={{ color: '#64748b', fontSize: 12, marginHorizontal: 12, fontWeight: '600' }}>
            OR LOCAL DEV TEST
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#334155' }} />
        </View>

        {/* Local Dev Mode Bypass Login Button */}
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
              Dev Mode: Instant Bypass Login
            </Text>
            <Text style={{ color: '#a78bfa', fontSize: 11 }}>
              Test locally without password or email magic link
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
