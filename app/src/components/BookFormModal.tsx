import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Book, ReadStatus, bookSchema } from '../schemas/book';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';

interface BookFormModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: Partial<Book> | null;
}

export const BookFormModal: React.FC<BookFormModalProps> = ({
  visible,
  onClose,
  initialData,
}) => {
  const { addBook, updateBook } = useLibrary();

  const [title, setTitle] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [readStatus, setReadStatus] = useState<ReadStatus>('unread');
  const [seriesName, setSeriesName] = useState('');
  const [seriesVolumeNumber, setSeriesVolumeNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setAuthorInput(initialData.authors?.join(', ') || '');
      setIsbn(initialData.isbn || '');
      setCoverUrl(initialData.coverUrl || '');
      setPublisher(initialData.publisher || '');
      setPublishDate(initialData.publishDate || '');
      setPageCount(initialData.pageCount ? String(initialData.pageCount) : '');
      setReadStatus(initialData.readStatus || 'unread');
      setSeriesName(initialData.seriesName || '');
      setSeriesVolumeNumber(
        initialData.seriesVolumeNumber ? String(initialData.seriesVolumeNumber) : ''
      );
    } else {
      resetForm();
    }
    setErrorMsg(null);
  }, [initialData, visible]);

  const resetForm = () => {
    setTitle('');
    setAuthorInput('');
    setIsbn('');
    setCoverUrl('');
    setPublisher('');
    setPublishDate('');
    setPageCount('');
    setReadStatus('unread');
    setSeriesName('');
    setSeriesVolumeNumber('');
    setErrorMsg(null);
  };

  const handleSubmit = () => {
    setErrorMsg(null);
    const authors = authorInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const seriesVolNum = seriesVolumeNumber ? parseInt(seriesVolumeNumber, 10) : undefined;
    const seriesId = seriesName
      ? 'series-' + seriesName.toLowerCase().replace(/[^a-z0-9]/g, '')
      : undefined;

    const bookPayload = {
      title: title.trim(),
      authors: authors.length ? authors : ['Unknown Author'],
      isbn: isbn.trim(),
      coverUrl: coverUrl.trim() || undefined,
      publisher: publisher.trim() || undefined,
      publishDate: publishDate.trim() || undefined,
      pageCount: pageCount ? parseInt(pageCount, 10) : undefined,
      readStatus,
      seriesId: seriesId || null,
      seriesName: seriesName.trim() || null,
      seriesVolumeNumber: seriesVolNum || null,
    };

    if (initialData?.id) {
      updateBook(initialData.id, bookPayload);
      onClose();
    } else {
      const result = addBook(bookPayload);
      if (result.success) {
        resetForm();
        onClose();
      } else {
        setErrorMsg(result.error || 'Failed to save book validation errors');
      }
    }
  };

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
            maxWidth: 560,
            maxHeight: '90%',
            borderWidth: 1,
            borderColor: '#334155',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
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
            <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700' }}>
              {initialData?.id ? 'Edit Book' : 'Add New Book'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {errorMsg && (
              <View
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderColor: '#ef4444',
                  borderWidth: 1,
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#fca5a5', fontSize: 13, fontWeight: '600' }}>
                  {errorMsg}
                </Text>
              </View>
            )}

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                Book Title *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. The Way of Kings"
                placeholderTextColor="#64748b"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                  fontSize: 14,
                }}
              />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                Author(s) * (comma separated)
              </Text>
              <TextInput
                value={authorInput}
                onChangeText={setAuthorInput}
                placeholder="e.g. Brandon Sanderson"
                placeholderTextColor="#64748b"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                  fontSize: 14,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                  ISBN-10 / ISBN-13
                </Text>
                <TextInput
                  value={isbn}
                  onChangeText={setIsbn}
                  placeholder="978..."
                  placeholderTextColor="#64748b"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#334155',
                    fontSize: 14,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                  Status
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {(['unread', 'reading', 'read'] as ReadStatus[]).map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setReadStatus(st)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        backgroundColor: readStatus === st ? '#0284c7' : '#0f172a',
                        borderRadius: 8,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: readStatus === st ? '#0284c7' : '#334155',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 2 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                  Series Name (Optional)
                </Text>
                <TextInput
                  value={seriesName}
                  onChangeText={setSeriesName}
                  placeholder="e.g. The Stormlight Archive"
                  placeholderTextColor="#64748b"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#334155',
                    fontSize: 14,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                  Vol #
                </Text>
                <TextInput
                  value={seriesVolumeNumber}
                  onChangeText={setSeriesVolumeNumber}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#64748b"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#334155',
                    fontSize: 14,
                  }}
                />
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                Cover Image URL (Optional)
              </Text>
              <TextInput
                value={coverUrl}
                onChangeText={setCoverUrl}
                placeholder="https://..."
                placeholderTextColor="#64748b"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                  fontSize: 14,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                  Publisher
                </Text>
                <TextInput
                  value={publisher}
                  onChangeText={setPublisher}
                  placeholder="Tor Books"
                  placeholderTextColor="#64748b"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#334155',
                    fontSize: 14,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                  Page Count
                </Text>
                <TextInput
                  value={pageCount}
                  onChangeText={setPageCount}
                  keyboardType="numeric"
                  placeholder="1001"
                  placeholderTextColor="#64748b"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#334155',
                    fontSize: 14,
                  }}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
                {initialData?.id ? 'Save Changes' : 'Add Book to Library'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
