import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { LibraryProvider } from '../src/context/LibraryContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LibraryProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0f172a' },
            }}
          >
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </LibraryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
