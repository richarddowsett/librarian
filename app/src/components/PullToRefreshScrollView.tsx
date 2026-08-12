import React, { useRef, useState } from 'react';
import {
  ScrollView,
  RefreshControl,
  View,
  Text,
  ActivityIndicator,
  ScrollViewProps,
  Platform,
} from 'react-native';

interface PullToRefreshScrollViewProps extends ScrollViewProps {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  children?: React.ReactNode;
  pullUpToRefreshText?: string;
}

export const PullToRefreshScrollView: React.FC<PullToRefreshScrollViewProps> = ({
  refreshing,
  onRefresh,
  children,
  style,
  contentContainerStyle,
  pullUpToRefreshText = 'Pulling to refresh...',
  ...props
}) => {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const touchStartY = useRef<number | null>(null);
  const isPullingRef = useRef<boolean>(false);

  const handleTouchStart = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent && e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
      touchStartY.current = e.nativeEvent.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: any) => {
    if (
      Platform.OS === 'web' &&
      isPullingRef.current &&
      touchStartY.current !== null &&
      e.nativeEvent &&
      e.nativeEvent.touches &&
      e.nativeEvent.touches.length > 0
    ) {
      const currentY = e.nativeEvent.touches[0].clientY;
      const diff = Math.abs(currentY - touchStartY.current);
      // Support pull gesture (pulling down or pulling up)
      if (diff > 15) {
        setPullDistance(diff);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (Platform.OS === 'web' && isPullingRef.current) {
      if (pullDistance > 60 && !refreshing) {
        setPullDistance(0);
        await onRefresh();
      } else {
        setPullDistance(0);
      }
      isPullingRef.current = false;
      touchStartY.current = null;
    }
  };

  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#38bdf8"
          colors={['#38bdf8']}
          progressBackgroundColor="#1e293b"
        />
      }
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {/* Active Refreshing Header Indicator */}
      {refreshing && (
        <View
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 10,
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderRadius: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(56, 189, 248, 0.3)',
          }}
        >
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={{ color: '#38bdf8', fontSize: 14, fontWeight: '600', includeFontPadding: false }}>
            Refreshing library catalogue...
          </Text>
        </View>
      )}

      {/* Pull Gesture Progress Hint on Web */}
      {!refreshing && pullDistance > 25 && (
        <View
          style={{
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(30, 41, 59, 0.7)',
            borderRadius: 8,
            marginBottom: 12,
            opacity: Math.min(1, pullDistance / 60),
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>
            {pullDistance > 60 ? 'Release to refresh' : pullUpToRefreshText}
          </Text>
        </View>
      )}

      {children}
    </ScrollView>
  );
};
