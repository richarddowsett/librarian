import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraScanner } from '../../src/components/CameraScanner';
import { BookshelfScanner } from '../../src/components/BookshelfScanner';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ScanScreen() {
  const router = useRouter();
  const [scanMode, setScanMode] = useState<'barcode' | 'bookshelf'>('barcode');

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* Mode Switching Navigation Segment Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 4,
            width: '100%',
            maxWidth: 480,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <TouchableOpacity
            onPress={() => setScanMode('barcode')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: scanMode === 'barcode' ? '#0284c7' : 'transparent',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="barcode-outline"
              size={18}
              color={scanMode === 'barcode' ? '#ffffff' : '#94a3b8'}
            />
            <Text
              style={{
                color: scanMode === 'barcode' ? '#ffffff' : '#cbd5e1',
                fontSize: 14,
                fontWeight: scanMode === 'barcode' ? '800' : '600',
              }}
            >
              Barcode Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setScanMode('bookshelf')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: scanMode === 'bookshelf' ? '#0284c7' : 'transparent',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={scanMode === 'bookshelf' ? '#ffffff' : '#94a3b8'}
            />
            <Text
              style={{
                color: scanMode === 'bookshelf' ? '#ffffff' : '#cbd5e1',
                fontSize: 14,
                fontWeight: scanMode === 'bookshelf' ? '800' : '600',
              }}
            >
              Bookshelf Photo AI
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Body */}
      {scanMode === 'barcode' ? (
        <CameraScanner
          onBookCataloged={() => {
            router.push('/');
          }}
        />
      ) : (
        <BookshelfScanner
          onBookCataloged={() => {
            router.push('/');
          }}
        />
      )}
    </View>
  );
}
