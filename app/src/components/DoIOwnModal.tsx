import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLibrary } from '../context/LibraryContext';
import { Book } from '../schemas/book';

interface DoIOwnModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DoIOwnModal: React.FC<DoIOwnModalProps> = ({ visible, onClose }) => {
  const { books, addBook } = useLibrary();
  const [query, setQuery] = useState<string>('');
  const [addedBookId, setAddedBookId] = useState<string | null>(null);
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setAddedBookId(null);
      setIsCameraScanning(false);
    }
  }, [visible]);

  if (!visible) return null;

  const playBeep = () => {
    try {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1760, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.12);
        }
      }
    } catch (e) {
      console.warn('Audio beep failed:', e);
    }
  };

  const handleBarcodeScanned = (scannedIsbn: string) => {
    if (!scannedIsbn) return;
    playBeep();
    setQuery(scannedIsbn);
    setIsCameraScanning(false);
  };

  const startCameraScan = async () => {
    if (Platform.OS !== 'web' && (!permission || !permission.granted)) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setIsCameraScanning(true);
  };

  const cleanQuery = query.trim().toLowerCase();
  const cleanIsbn = cleanQuery.replace(/[- ]/g, '');

  // Perform search matching
  const matchingBooks: Book[] = cleanQuery
    ? books.filter((b) => {
        const titleMatch = b.title.toLowerCase().includes(cleanQuery);
        const authorMatch = b.authors.some((a) => a.toLowerCase().includes(cleanQuery));
        const isbnMatch = cleanIsbn && b.isbn ? b.isbn.replace(/[- ]/g, '').includes(cleanIsbn) : false;
        return titleMatch || authorMatch || isbnMatch;
      })
    : [];

  const hasSearched = cleanQuery.length >= 2;

  const handleAddPurchasedBook = async (title: string, author: string) => {
    const res = await addBook({
      title,
      authors: [author || 'Unknown Author'],
      isbn: cleanIsbn.length >= 10 ? cleanIsbn : '',
      readStatus: 'unread',
    });
    if (res.success && res.book?.id) {
      setAddedBookId(res.book.id);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#38bdf8',
                }}
              >
                <Ionicons name="storefront" size={20} color="#38bdf8" />
              </View>
              <View>
                <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '800' }}>
                  Do I Own This Book?
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>
                  Bookstore Ownership Instant Checker
                </Text>
              </View>
            </View>

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

          <ScrollView style={{ padding: 20 }}>
            {/* Live Camera Scanner Box inside Modal */}
            {isCameraScanning ? (
              <View
                style={{
                  height: 220,
                  backgroundColor: '#0f172a',
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: '#38bdf8',
                  marginBottom: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {Platform.OS !== 'web' ? (
                  <CameraView
                    style={{ width: '100%', height: '100%' }}
                    onBarcodeScanned={({ data }) => handleBarcodeScanned(data)}
                  >
                    <View
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                      }}
                    >
                      <View
                        style={{
                          width: 220,
                          height: 120,
                          borderWidth: 2,
                          borderColor: '#38bdf8',
                          borderRadius: 12,
                          backgroundColor: 'rgba(56, 189, 248, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View style={{ width: '80%', height: 2, backgroundColor: '#ef4444' }} />
                      </View>
                      <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                        Point camera at book barcode
                      </Text>
                    </View>
                  </CameraView>
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Ionicons name="barcode-outline" size={48} color="#38bdf8" />
                    <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700', marginTop: 8 }}>
                      Webcam Scanner Ready
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                      Hold book barcode up to camera or type ISBN manually below.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => setIsCameraScanning(false)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#f8fafc', fontSize: 12, fontWeight: '700' }}>Cancel Camera</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Instant Checker Search Bar & Camera Button */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#0f172a',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 2,
                  borderColor: hasSearched ? (matchingBooks.length > 0 ? '#10b981' : '#38bdf8') : '#334155',
                }}
              >
                <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Type title, author, or barcode ISBN..."
                  placeholderTextColor="#64748b"
                  autoFocus={!isCameraScanning}
                  style={{ flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '600' }}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Barcode Scanner Launch Button */}
              <TouchableOpacity
                onPress={startCameraScan}
                style={{
                  backgroundColor: '#0284c7',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Ionicons name="barcode-outline" size={22} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                  Scan Barcode
                </Text>
              </TouchableOpacity>
            </View>

            {/* Result State Cards */}
            {hasSearched ? (
              matchingBooks.length > 0 ? (
                <View style={{ gap: 16, marginBottom: 20 }}>
                  {/* YES Banner */}
                  <View
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderColor: '#10b981',
                      borderWidth: 2,
                      borderRadius: 16,
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Ionicons name="checkmark-circle-sharp" size={36} color="#10b981" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#10b981', fontSize: 18, fontWeight: '800' }}>
                        YES! You Own This Book!
                      </Text>
                      <Text style={{ color: '#ecfdf5', fontSize: 13, marginTop: 2 }}>
                        Found {matchingBooks.length} matching book(s) in your personal library.
                      </Text>
                    </View>
                  </View>

                  {/* Matching Books List */}
                  <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                    Matching Owned Titles on Your Shelf:
                  </Text>
                  {matchingBooks.map((book) => (
                    <View
                      key={book.id}
                      style={{
                        backgroundColor: '#0f172a',
                        borderRadius: 16,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#334155',
                        flexDirection: 'row',
                        gap: 14,
                        alignItems: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 50,
                          height: 72,
                          borderRadius: 8,
                          backgroundColor: '#1e293b',
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {book.coverUrl ? (
                          <Image
                            source={{ uri: book.coverUrl }}
                            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                          />
                        ) : (
                          <Ionicons name="book" size={24} color="#64748b" />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800' }}>
                          {book.title}
                        </Text>
                        <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                          By {book.authors.join(', ')}
                        </Text>

                        {book.seriesName && (
                          <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                            Series: {book.seriesName} {book.seriesVolumeNumber ? `#${book.seriesVolumeNumber}` : ''}
                          </Text>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <View
                            style={{
                              backgroundColor:
                                book.readStatus === 'read'
                                  ? 'rgba(5, 150, 105, 0.2)'
                                  : book.readStatus === 'reading'
                                  ? 'rgba(2, 132, 199, 0.2)'
                                  : 'rgba(100, 116, 139, 0.2)',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  book.readStatus === 'read'
                                    ? '#34d399'
                                    : book.readStatus === 'reading'
                                    ? '#38bdf8'
                                    : '#94a3b8',
                                fontSize: 11,
                                fontWeight: '700',
                              }}
                            >
                              {book.readStatus === 'read' ? 'Read' : book.readStatus === 'reading' ? 'Reading' : 'Unread'}
                            </Text>
                          </View>
                          {book.rating ? (
                            <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '700' }}>
                              ★ {book.rating}/5
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                /* NO Banner */
                <View style={{ gap: 16, marginBottom: 20 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      borderColor: '#38bdf8',
                      borderWidth: 2,
                      borderRadius: 16,
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Ionicons name="cart-outline" size={36} color="#38bdf8" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#38bdf8', fontSize: 18, fontWeight: '800' }}>
                        NO. You Do Not Own This Book!
                      </Text>
                      <Text style={{ color: '#e0f2fe', fontSize: 13, marginTop: 2 }}>
                        Safe to buy! "{query}" is not found in your library.
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleAddPurchasedBook(query, '')}
                    disabled={!!addedBookId}
                    style={{
                      backgroundColor: addedBookId ? '#059669' : '#0284c7',
                      paddingVertical: 14,
                      borderRadius: 14,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name={addedBookId ? 'checkmark-circle' : 'bag-add-outline'} size={20} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                      {addedBookId ? 'Added to Your Library!' : `I'm Buying It — Add "${query}" to Library`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              /* Idle / Prompt Banner */
              <View
                style={{
                  backgroundColor: '#0f172a',
                  borderRadius: 16,
                  padding: 24,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#334155',
                  marginBottom: 20,
                }}
              >
                <Ionicons name="scan-outline" size={48} color="#38bdf8" />
                <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
                  Stand in front of bookstore shelf
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 360 }}>
                  Tap "Scan Barcode" above to scan any book barcode directly, or type a title, author, or ISBN manually!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
