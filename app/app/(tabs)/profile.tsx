import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLibrary } from '../../src/context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout, loginWithBypass } = useAuth();
  const { stats } = useLibrary();
  const router = useRouter();

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: '#f8fafc', fontSize: 26, fontWeight: '800' }}>
          User Profile & Settings
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>
          Manage your account credentials, security preferences, and environment controls.
        </Text>
      </View>

      {/* User Info Card */}
      <View
        style={{
          backgroundColor: '#1e293b',
          borderRadius: 20,
          padding: 24,
          borderWidth: 1,
          borderColor: '#334155',
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={{ width: 64, height: 64, borderRadius: 32 }} />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#0284c7',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={32} color="#ffffff" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800' }}>
            {user.displayName || 'Librarian Reader'}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>{user.email}</Text>
          <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            User ID: {user.uid}
          </Text>
        </View>

        {user.isDevBypass && (
          <View
            style={{
              backgroundColor: 'rgba(124, 58, 237, 0.15)',
              borderColor: '#7c3aed',
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: '800' }}>DEV MODE</Text>
          </View>
        )}
      </View>

      {/* Library Summary */}
      <View
        style={{
          backgroundColor: '#1e293b',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: '#334155',
          marginBottom: 20,
        }}
      >
        <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
          Collection Overview
        </Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>Total Books Cataloged</Text>
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700' }}>{stats.totalBooks}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>Books Completed</Text>
            <Text style={{ color: '#059669', fontSize: 14, fontWeight: '700' }}>{stats.readCount}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>Books Reading Now</Text>
            <Text style={{ color: '#38bdf8', fontSize: 14, fontWeight: '700' }}>{stats.readingCount}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>Average Star Rating</Text>
            <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '700' }}>
              {stats.avgRating > 0 ? `${stats.avgRating} / 5` : 'No ratings yet'}
            </Text>
          </View>
        </View>
      </View>

      {/* Security & Local Dev Controls */}
      <View
        style={{
          backgroundColor: '#1e293b',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: '#334155',
          marginBottom: 24,
        }}
      >
        <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
          Security & Developer Tools
        </Text>

        <TouchableOpacity
          onPress={() => loginWithBypass('Demo Collector (Bypass Active)')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#334155',
          }}
        >
          <View>
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '600' }}>
              Re-sync Dev Mode Demo User
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
              Reset session to demo state with full mock library catalog
            </Text>
          </View>
          <Ionicons name="refresh" size={20} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      {/* Logout Action */}
      <TouchableOpacity
        onPress={() => {
          logout();
          router.replace('/(auth)/login');
        }}
        style={{
          backgroundColor: '#7f1d1d',
          borderColor: '#ef4444',
          borderWidth: 1,
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#fca5a5" />
        <Text style={{ color: '#fca5a5', fontSize: 16, fontWeight: '800' }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
