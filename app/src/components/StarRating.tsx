import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number | null | undefined;
  maxStars?: number;
  size?: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  maxStars = 5,
  size = 18,
  onRatingChange,
  interactive = false,
}) => {
  const currentRating = rating || 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= currentRating;

        if (interactive && onRatingChange) {
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => onRatingChange(starValue)}
              style={{ padding: 2 }}
            >
              <Ionicons
                name={isFilled ? 'star' : 'star-outline'}
                size={size}
                color={isFilled ? '#f59e0b' : '#64748b'}
              />
            </TouchableOpacity>
          );
        }

        return (
          <Ionicons
            key={index}
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? '#f59e0b' : '#475569'}
          />
        );
      })}
    </View>
  );
};
