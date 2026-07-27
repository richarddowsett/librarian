import React from 'react';
import { View } from 'react-native';
import { CameraScanner } from '../../src/components/CameraScanner';
import { useRouter } from 'expo-router';

export default function ScanScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <CameraScanner
        onBookCataloged={() => {
          router.push('/');
        }}
      />
    </View>
  );
}
