import React from 'react';
import { View, useWindowDimensions, Text, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { Sidebar } from '../../src/components/Sidebar';
import { useAuth } from '../../src/context/AuthContext';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isWebDesktop = width >= 768;
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  if (!user) {
    // If not logged in, redirect to login page
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 12, includeFontPadding: false }}>
          Authentication Required
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={{ backgroundColor: '#0284c7', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700', includeFontPadding: false }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.body.style.backgroundColor = '#0f172a';
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <Header />
      <View style={{ flex: 1, flexDirection: isWebDesktop ? 'row' : 'column' }}>
        {isWebDesktop && <Sidebar />}

        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <Tabs
            screenOptions={{
              sceneStyle: { backgroundColor: '#0f172a' },
              headerShown: false,
              tabBarStyle: isWebDesktop
                ? { display: 'none' } // Hide bottom tabs on desktop
                : {
                    backgroundColor: '#0f172a',
                    borderTopColor: '#1e293b',
                    borderTopWidth: 1,
                    height: 52 + bottomPadding,
                    paddingBottom: bottomPadding,
                    paddingTop: 6,
                  },
              tabBarActiveTintColor: '#38bdf8',
              tabBarInactiveTintColor: '#64748b',
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Library',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="book" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="scan"
              options={{
                title: 'Scan ISBN',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="barcode" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="series"
              options={{
                title: 'Series',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="layers" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: 'Profile',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="person" size={size} color={color} />
                ),
              }}
            />
          </Tabs>
        </View>
      </View>
    </View>
  );
}
