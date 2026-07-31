import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View
      style={{
        height: 64,
        backgroundColor: '#0f172a',
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <TouchableOpacity
        onPress={() => router.push('/')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: '#0284c7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="library-sharp" size={22} color="#ffffff" />
        </View>
        <View>
          <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>
            LIBRARIAN
          </Text>
          <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
            BOOK CATALOGUE
          </Text>
        </View>
      </TouchableOpacity>

      {user && (
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#1e293b',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          {user.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={{ width: 28, height: 28, borderRadius: 14 }}
            />
          ) : (
            <Ionicons name="person-circle" size={28} color="#38bdf8" />
          )}
          <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: '600' }}>
            {user.displayName || user.email.split('@')[0]}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
