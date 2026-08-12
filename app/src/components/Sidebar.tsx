import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { label: 'Library Catalogue', path: '/', icon: 'book-sharp' as const },
    { label: 'AI & Barcode Scanner', path: '/scan', icon: 'barcode-sharp' as const },
    { label: 'Series Tracker', path: '/series', icon: 'layers-sharp' as const },
    { label: 'Profile & Settings', path: '/profile', icon: 'person-sharp' as const },
  ];

  return (
    <View
      style={{
        width: 240,
        backgroundColor: '#0f172a',
        borderRightWidth: 1,
        borderRightColor: '#1e293b',
        paddingVertical: 24,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text
          style={{
            color: '#64748b',
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.2,
            marginBottom: 16,
            paddingHorizontal: 12,
          }}
        >
          NAVIGATION
        </Text>

        <View style={{ gap: 6 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

            return (
              <TouchableOpacity
                key={item.path}
                onPress={() => router.push(item.path as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: isActive ? '#0284c7' : 'transparent',
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? '#ffffff' : '#94a3b8'}
                />
                <Text
                  style={{
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    fontSize: 14,
                    fontWeight: isActive ? '700' : '500',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        onPress={logout}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: '#1e293b',
          borderWidth: 1,
          borderColor: '#334155',
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};
