import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookshelfCandidateBook } from '../services/bookshelfAi';
import { fetchBookByISBN } from '../services/openLibrary';
import { useLibrary } from '../context/LibraryContext';

export interface BookshelfReviewModalProps {
  visible: boolean;
  onClose: () => void;
  initialBooks: BookshelfCandidateBook[];
  onSuccessAdded?: (count: number) => void;
}

interface EditableCandidateBook extends BookshelfCandidateBook {
  tempId: string;
  selected: boolean;
  isEditing: boolean;
  isSearchingFallback: boolean;
  fallbackError?: string | null;
}

export const BookshelfReviewModal: React.FC<BookshelfReviewModalProps> = ({
  visible,
  onClose,
  initialBooks,
  onSuccessAdded,
}) => {
  const { addBook } = useLibrary();
  const [candidateBooks, setCandidateBooks] = useState<EditableCandidateBook[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && initialBooks) {
      setCandidateBooks(
        initialBooks.map((b, idx) => ({
          ...b,
          tempId: `candidate-${idx}-${Date.now()}`,
          selected: true,
          isEditing: false,
          isSearchingFallback: false,
        }))
      );
      setSubmitMessage(null);
    }
  }, [visible, initialBooks]);

  const selectedCount = candidateBooks.filter((b) => b.selected).length;

  const handleToggleSelectAll = () => {
    const allSelected = candidateBooks.every((b) => b.selected);
    setCandidateBooks((prev) => prev.map((b) => ({ ...b, selected: !allSelected })));
  };

  const handleToggleSelect = (tempId: string) => {
    setCandidateBooks((prev) =>
      prev.map((b) => (b.tempId === tempId ? { ...b, selected: !b.selected } : b))
    );
  };

  const handleToggleEditing = (tempId: string) => {
    setCandidateBooks((prev) =>
      prev.map((b) => (b.tempId === tempId ? { ...b, isEditing: !b.isEditing } : b))
    );
  };

  const handleUpdateField = (
    tempId: string,
    field: keyof BookshelfCandidateBook,
    value: any
  ) => {
    setCandidateBooks((prev) =>
      prev.map((b) => {
        if (b.tempId === tempId) {
          if (field === 'authors') {
            const authorsList = typeof value === 'string' ? value.split(',').map((s) => s.trim()) : value;
            return { ...b, authors: authorsList };
          }
          return { ...b, [field]: value };
        }
        return b;
      })
    );
  };

  const handleFallbackSearch = async (tempId: string) => {
    const targetBook = candidateBooks.find((b) => b.tempId === tempId);
    if (!targetBook) return;

    const searchTerm = (targetBook.isbn || targetBook.title).trim();
    if (!searchTerm) return;

    setCandidateBooks((prev) =>
      prev.map((b) =>
        b.tempId === tempId ? { ...b, isSearchingFallback: true, fallbackError: null } : b
      )
    );

    try {
      const match = await fetchBookByISBN(searchTerm);
      if (match) {
        setCandidateBooks((prev) =>
          prev.map((b) =>
            b.tempId === tempId
              ? {
                  ...b,
                  title: match.title || b.title,
                  authors: match.authors && match.authors.length ? match.authors : b.authors,
                  isbn: match.isbn || b.isbn,
                  publisher: match.publisher || b.publisher,
                  publishDate: match.publishDate || b.publishDate,
                  pageCount: match.pageCount || b.pageCount,
                  coverUrl: match.coverUrl || b.coverUrl,
                  seriesName: match.seriesName || b.seriesName,
                  seriesVolumeNumber: match.seriesVolumeNumber || b.seriesVolumeNumber,
                  isSearchingFallback: false,
                  fallbackError: null,
                }
              : b
          )
        );
      } else {
        setCandidateBooks((prev) =>
          prev.map((b) =>
            b.tempId === tempId
              ? {
                  ...b,
                  isSearchingFallback: false,
                  fallbackError: 'No online metadata match found. Please verify details manually.',
                }
              : b
          )
        );
      }
    } catch (err) {
      setCandidateBooks((prev) =>
        prev.map((b) =>
          b.tempId === tempId
            ? {
                ...b,
                isSearchingFallback: false,
                fallbackError: 'Search request failed.',
              }
            : b
        )
      );
    }
  };

  const handleRemoveCandidate = (tempId: string) => {
    setCandidateBooks((prev) => prev.filter((b) => b.tempId !== tempId));
  };

  const handleAddSelectedToLibrary = async () => {
    const selectedBooks = candidateBooks.filter((b) => b.selected);
    if (selectedBooks.length === 0) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    let addedCount = 0;
    let errorMessages: string[] = [];

    for (const book of selectedBooks) {
      const res = await addBook({
        title: book.title || 'Untitled Book',
        authors: Array.isArray(book.authors) && book.authors.length ? book.authors : ['Unknown Author'],
        isbn: book.isbn || '',
        coverUrl: book.coverUrl,
        publisher: book.publisher,
        publishDate: book.publishDate,
        pageCount: book.pageCount,
        readStatus: 'unread',
        seriesName: book.seriesName || null,
        seriesVolumeNumber: book.seriesVolumeNumber || null,
      });

      if (res.success) {
        addedCount++;
      } else if (res.error) {
        errorMessages.push(`"${book.title}": ${res.error}`);
      }
    }

    setIsSubmitting(false);

    if (onSuccessAdded) {
      onSuccessAdded(addedCount);
    }

    if (errorMessages.length > 0) {
      setSubmitMessage(`Added ${addedCount} book(s). Note: ${errorMessages.join('; ')}`);
      setTimeout(() => {
        onClose();
      }, 2500);
    } else {
      setSubmitMessage(`Successfully added ${addedCount} book(s) to your library!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 720,
            maxHeight: '90%',
            backgroundColor: '#0f172a',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#334155',
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#1e293b',
              paddingBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="sparkles" size={22} color="#38bdf8" />
              </View>
              <View>
                <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800' }}>
                  Bookshelf AI Scan Review
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  Verify AI-detected titles & authors before adding to your library
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Batch Actions Toolbar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={handleToggleSelectAll}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Ionicons
                name={
                  candidateBooks.length > 0 && candidateBooks.every((b) => b.selected)
                    ? 'checkbox'
                    : 'square-outline'
                }
                size={20}
                color="#38bdf8"
              />
              <Text style={{ color: '#38bdf8', fontWeight: '700', fontSize: 14 }}>
                {candidateBooks.length > 0 && candidateBooks.every((b) => b.selected)
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>

            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>
              {selectedCount} of {candidateBooks.length} Selected
            </Text>
          </View>

          {/* Success / Error Message Banner */}
          {submitMessage && (
            <View
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                borderColor: '#22c55e',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#22c55e', fontWeight: '700', textAlign: 'center' }}>
                {submitMessage}
              </Text>
            </View>
          )}

          {/* List of Candidate Books */}
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
            {candidateBooks.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 30 }}>
                <Ionicons name="book-outline" size={48} color="#64748b" />
                <Text style={{ color: '#94a3b8', marginTop: 10 }}>No candidate books in list.</Text>
              </View>
            ) : (
              candidateBooks.map((book) => (
                <View
                  key={book.tempId}
                  style={{
                    backgroundColor: book.selected ? '#1e293b' : '#0f172a',
                    borderColor: book.selected ? '#0284c7' : '#334155',
                    borderWidth: book.selected ? 1.5 : 1,
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => handleToggleSelect(book.tempId)}
                      style={{ justifyContent: 'center', paddingRight: 4 }}
                    >
                      <Ionicons
                        name={book.selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={book.selected ? '#38bdf8' : '#64748b'}
                      />
                    </TouchableOpacity>

                    {/* Book Cover Image / Icon */}
                    <View
                      style={{
                        width: 52,
                        height: 74,
                        borderRadius: 8,
                        backgroundColor: '#0f172a',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#334155',
                      }}
                    >
                      {book.coverUrl ? (
                        <Image
                          source={{ uri: book.coverUrl }}
                          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                        />
                      ) : (
                        <Ionicons name="book" size={26} color="#64748b" />
                      )}
                    </View>

                    {/* Details & Edit Fields */}
                    <View style={{ flex: 1 }}>
                      {book.isEditing ? (
                        <View style={{ gap: 8, marginBottom: 8 }}>
                          <View>
                            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                              Title:
                            </Text>
                            <TextInput
                              value={book.title}
                              onChangeText={(val) => handleUpdateField(book.tempId, 'title', val)}
                              style={{
                                backgroundColor: '#0f172a',
                                color: '#f8fafc',
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                fontSize: 14,
                                borderWidth: 1,
                                borderColor: '#0284c7',
                              }}
                            />
                          </View>
                          <View>
                            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                              Author(s) (comma separated):
                            </Text>
                            <TextInput
                              value={Array.isArray(book.authors) ? book.authors.join(', ') : ''}
                              onChangeText={(val) =>
                                handleUpdateField(book.tempId, 'authors', val)
                              }
                              style={{
                                backgroundColor: '#0f172a',
                                color: '#f8fafc',
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                fontSize: 13,
                                borderWidth: 1,
                                borderColor: '#0284c7',
                              }}
                            />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                                ISBN:
                              </Text>
                              <TextInput
                                value={book.isbn || ''}
                                onChangeText={(val) =>
                                  handleUpdateField(book.tempId, 'isbn', val)
                                }
                                style={{
                                  backgroundColor: '#0f172a',
                                  color: '#f8fafc',
                                  borderRadius: 8,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  fontSize: 12,
                                  borderWidth: 1,
                                  borderColor: '#334155',
                                }}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                                Publisher:
                              </Text>
                              <TextInput
                                value={book.publisher || ''}
                                onChangeText={(val) =>
                                  handleUpdateField(book.tempId, 'publisher', val)
                                }
                                style={{
                                  backgroundColor: '#0f172a',
                                  color: '#f8fafc',
                                  borderRadius: 8,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  fontSize: 12,
                                  borderWidth: 1,
                                  borderColor: '#334155',
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={{ marginBottom: 6 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text
                              style={{
                                color: '#f8fafc',
                                fontSize: 16,
                                fontWeight: '800',
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {book.title || 'Untitled'}
                            </Text>

                            {book.confidence && (
                              <View
                                style={{
                                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 8,
                                  marginLeft: 6,
                                }}
                              >
                                <Text
                                  style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}
                                >
                                  {Math.round(book.confidence * 100)}% match
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}
                            numberOfLines={1}
                          >
                            By{' '}
                            {Array.isArray(book.authors) && book.authors.length
                              ? book.authors.join(', ')
                              : 'Unknown Author'}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: 12,
                              marginTop: 6,
                            }}
                          >
                            {book.isbn && !book.isbn.startsWith('NOISBN') ? (
                              <Text style={{ color: '#64748b', fontSize: 11 }}>
                                ISBN: {book.isbn}
                              </Text>
                            ) : null}
                            {book.publisher ? (
                              <Text style={{ color: '#64748b', fontSize: 11 }}>
                                Pub: {book.publisher}
                              </Text>
                            ) : null}
                            {book.pageCount ? (
                              <Text style={{ color: '#64748b', fontSize: 11 }}>
                                Pages: {book.pageCount}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      )}

                      {/* Fallback Error Alert */}
                      {book.fallbackError && (
                        <Text style={{ color: '#fca5a5', fontSize: 11, marginTop: 4 }}>
                          {book.fallbackError}
                        </Text>
                      )}

                      {/* Card Actions Row */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 6,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleToggleEditing(book.tempId)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#0f172a',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#334155',
                          }}
                        >
                          <Ionicons
                            name={book.isEditing ? 'checkmark' : 'pencil'}
                            size={14}
                            color="#38bdf8"
                          />
                          <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
                            {book.isEditing ? 'Done Editing' : 'Edit Details'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleFallbackSearch(book.tempId)}
                          disabled={book.isSearchingFallback}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#0f172a',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#334155',
                          }}
                        >
                          {book.isSearchingFallback ? (
                            <ActivityIndicator size="small" color="#38bdf8" />
                          ) : (
                            <>
                              <Ionicons name="search" size={14} color="#38bdf8" />
                              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
                                Metadata Search Fallback
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRemoveCandidate(book.tempId)}
                          style={{
                            marginLeft: 'auto',
                            padding: 4,
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Modal Footer Actions */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#1e293b',
              paddingTop: 16,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#1e293b',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#cbd5e1', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAddSelectedToLibrary}
              disabled={isSubmitting || selectedCount === 0}
              style={{
                backgroundColor: selectedCount > 0 ? '#0284c7' : '#334155',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                    Add Selected ({selectedCount}) to Library
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
