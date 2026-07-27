import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Book } from '../schemas/book';
import { StarRating } from './StarRating';
import { Ionicons } from '@expo/vector-icons';
import { useLibrary } from '../context/LibraryContext';

interface BookCardProps {
  book: Book;
  onPress: (book: Book) => void;
  style?: StyleProp<ViewStyle>;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onPress, style }) => {
  const { updateBookReview } = useLibrary();

  const handleQuickMarkRead = (e: any) => {
    e.stopPropagation?.();
    if (book.id) {
      updateBookReview(book.id, {
        readStatus: 'read',
        dateRead: new Date().toISOString(),
      });
    }
  };

  const getStatusBadge = () => {
    switch (book.readStatus) {
      case 'read':
        return { label: 'Read', bg: '#059669', text: '#ecfdf5', icon: 'checkmark-circle' as const };
      case 'reading':
        return { label: 'Reading', bg: '#0284c7', text: '#f0f9ff', icon: 'book' as const };
      case 'unread':
      default:
        return { label: 'Unread', bg: '#475569', text: '#f8fafc', icon: 'bookmark' as const };
    }
  };

  const status = getStatusBadge();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(book)}
      style={[
        {
          backgroundColor: '#1e293b',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#334155',
          overflow: 'hidden',
          flexDirection: 'column',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        },
        style,
      ]}
    >
      <View style={{ position: 'relative', height: 180, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
        {book.coverUrl ? (
          <Image
            source={{ uri: book.coverUrl }}
            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          />
        ) : (
          <View style={{ alignItems: 'center', padding: 12 }}>
            <Ionicons name="book-outline" size={48} color="#64748b" />
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
              No Cover
            </Text>
          </View>
        )}

        {/* Read Status Badge Overlay */}
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: status.bg,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name={status.icon} size={12} color={status.text} />
          <Text style={{ color: status.text, fontSize: 11, fontWeight: '700' }}>{status.label}</Text>
        </View>

        {/* 1-Click "Mark as Read" Quick Action Button */}
        {book.readStatus !== 'read' && (
          <TouchableOpacity
            onPress={handleQuickMarkRead}
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: 'rgba(5, 150, 105, 0.92)',
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              borderWidth: 1,
              borderColor: '#34d399',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 4,
            }}
          >
            <Ionicons name="checkmark-circle-sharp" size={14} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>
              Mark Read
            </Text>
          </TouchableOpacity>
        )}

        {book.seriesName && (
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <Text style={{ color: '#e2e8f0', fontSize: 10, fontWeight: '600' }}>
              {book.seriesName} {book.seriesVolumeNumber ? `#${book.seriesVolumeNumber}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={{ padding: 14, flex: 1, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 4 }} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }} numberOfLines={1}>
            {book.authors.join(', ')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <StarRating rating={book.rating} size={14} />
          {book.isbn ? (
            <Text style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>
              ISBN {book.isbn.slice(-4)}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};
