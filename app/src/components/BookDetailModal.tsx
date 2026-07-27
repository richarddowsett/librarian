import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Book, ReadStatus } from '../schemas/book';
import { StarRating } from './StarRating';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';

interface BookDetailModalProps {
  book: Book | null;
  visible: boolean;
  onClose: () => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  visible,
  onClose,
}) => {
  const { updateBookReview, deleteBook } = useLibrary();
  if (!book) return null;

  const [rating, setRating] = useState<number>(book.rating || 0);
  const [review, setReview] = useState<string>(book.review || '');
  const [readStatus, setReadStatus] = useState<ReadStatus>(book.readStatus);
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);

  const handleSaveReview = () => {
    updateBookReview(book.id!, {
      readStatus,
      rating: rating > 0 ? rating : null,
      review: review.trim() || undefined,
      dateRead: readStatus === 'read' ? (book.dateRead || new Date().toISOString()) : null,
    });
    setIsEditingReview(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${book.title}" from your library?`)) {
      deleteBook(book.id!);
      onClose();
    }
  };

  const statusOptions: { label: string; value: ReadStatus; color: string }[] = [
    { label: 'Unread', value: 'unread', color: '#64748b' },
    { label: 'In Progress', value: 'reading', color: '#0284c7' },
    { label: 'Read', value: 'read', color: '#059669' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 24,
            width: '100%',
            maxWidth: 600,
            maxHeight: '90%',
            borderWidth: 1,
            borderColor: '#334155',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Top Bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#334155',
            }}
          >
            <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700' }}>Book Details</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleDelete}
                style={{
                  backgroundColor: '#7f1d1d',
                  padding: 8,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#fca5a5" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  backgroundColor: '#334155',
                  padding: 8,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="close" size={18} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
              <View
                style={{
                  width: 110,
                  height: 160,
                  borderRadius: 12,
                  backgroundColor: '#0f172a',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                {book.coverUrl ? (
                  <Image source={{ uri: book.coverUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : (
                  <Ionicons name="book" size={40} color="#64748b" />
                )}
              </View>

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
                  {book.title}
                </Text>
                <Text style={{ color: '#0284c7', fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
                  By {book.authors.join(', ')}
                </Text>

                {book.seriesName && (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: 'rgba(2, 132, 199, 0.15)',
                      borderColor: '#0284c7',
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600' }}>
                      Series: {book.seriesName} {book.seriesVolumeNumber ? `#${book.seriesVolumeNumber}` : ''}
                    </Text>
                  </View>
                )}

                {book.isbn ? (
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>
                    ISBN: {book.isbn}
                  </Text>
                ) : null}

                {book.publisher ? (
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                    Publisher: {book.publisher} ({book.publishDate || 'N/A'})
                  </Text>
                ) : null}

                {book.pageCount ? (
                  <Text style={{ color: '#64748b', fontSize: 12 }}>
                    Pages: {book.pageCount}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Read Status Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
                Reading Status
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {statusOptions.map((opt) => {
                  const isSelected = readStatus === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setReadStatus(opt.value);
                        if (!isEditingReview) setIsEditingReview(true);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: isSelected ? opt.color : '#0f172a',
                        borderWidth: 1,
                        borderColor: isSelected ? opt.color : '#334155',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Star Rating & Review Section */}
            <View
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: '#334155',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: '#f8fafc', fontSize: 15, fontWeight: '700' }}>
                  Rating & Review
                </Text>
                {!isEditingReview ? (
                  <TouchableOpacity
                    onPress={() => setIsEditingReview(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="create-outline" size={16} color="#38bdf8" />
                    <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>Your Star Rating</Text>
                <StarRating
                  rating={rating}
                  size={24}
                  interactive={isEditingReview}
                  onRatingChange={(r) => setRating(r)}
                />
              </View>

              {isEditingReview ? (
                <View>
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>Your Notes & Thoughts</Text>
                  <TextInput
                    value={review}
                    onChangeText={setReview}
                    placeholder="Write your review or thoughts on this book..."
                    placeholderTextColor="#475569"
                    multiline
                    numberOfLines={4}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                      borderWidth: 1,
                      borderColor: '#475569',
                      textAlignVertical: 'top',
                      minHeight: 100,
                    }}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => setIsEditingReview(false)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#334155',
                      }}
                    >
                      <Text style={{ color: '#cbd5e1', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveReview}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#0284c7',
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: '700' }}>Save Review</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  {book.review ? (
                    <Text style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 20 }}>
                      "{book.review}"
                    </Text>
                  ) : (
                    <Text style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                      No review written yet. Tap edit to add your thoughts!
                    </Text>
                  )}
                  {book.dateRead && (
                    <Text style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>
                      Read on {new Date(book.dateRead).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
