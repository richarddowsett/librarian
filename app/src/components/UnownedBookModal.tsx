import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchUnownedBookDetails, CatalogBookDetails } from '../services/catalogService';
import { useLibrary } from '../context/LibraryContext';

interface UnownedBookModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  authorName?: string;
  seriesName?: string;
  seriesVolumeNumber?: number;
  initialCoverUrl?: string;
}

export const UnownedBookModal: React.FC<UnownedBookModalProps> = ({
  visible,
  onClose,
  title,
  authorName,
  seriesName,
  seriesVolumeNumber,
  initialCoverUrl,
}) => {
  const { addBook } = useLibrary();
  const [details, setDetails] = useState<CatalogBookDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [added, setAdded] = useState<boolean>(false);

  useEffect(() => {
    if (visible && title) {
      setLoading(true);
      setAdded(false);
      fetchUnownedBookDetails(title, authorName)
        .then((data) => {
          setDetails(data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, title, authorName]);

  if (!visible) return null;

  const displayCover = details?.coverUrl || initialCoverUrl;
  const displayAuthors = details?.authors?.length ? details.authors : authorName ? [authorName] : ['Unknown Author'];

  const handleAddToLibrary = async () => {
    setAdding(true);
    const res = await addBook({
      title: details?.title || title,
      authors: displayAuthors,
      isbn: details?.isbn || '',
      coverUrl: displayCover,
      publisher: details?.publisher,
      publishDate: details?.publishDate,
      pageCount: details?.pageCount,
      readStatus: 'unread',
      seriesName: seriesName || details?.seriesName || null,
      seriesVolumeNumber: seriesVolumeNumber || details?.seriesVolumeNumber || null,
    });

    setAdding(false);
    if (res.success) {
      setAdded(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
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
          {/* Header Bar */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderColor: '#f59e0b',
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '800' }}>
                  Unowned Book Preview
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#334155',
                padding: 8,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="#e2e8f0" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {/* Book Cover and Basic Info */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
              <View
                style={{
                  width: 120,
                  height: 175,
                  borderRadius: 12,
                  backgroundColor: '#0f172a',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#475569',
                  borderStyle: 'dashed',
                }}
              >
                {displayCover ? (
                  <Image
                    source={{ uri: displayCover }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                ) : (
                  <Ionicons name="book-outline" size={44} color="#f59e0b" />
                )}
              </View>

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
                  {details?.title || title}
                </Text>
                <Text style={{ color: '#38bdf8', fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
                  By {displayAuthors.join(', ')}
                </Text>

                {(seriesName || details?.seriesName) && (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      borderColor: '#38bdf8',
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600' }}>
                      Series: {seriesName || details?.seriesName}{' '}
                      {seriesVolumeNumber || details?.seriesVolumeNumber
                        ? `#${seriesVolumeNumber || details?.seriesVolumeNumber}`
                        : ''}
                    </Text>
                  </View>
                )}

                {/* Key Metadata Pill Badges */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {details?.publishDate ? (
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#334155' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                        📅 Published: {details.publishDate}
                      </Text>
                    </View>
                  ) : null}

                  {details?.pageCount ? (
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#334155' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                        📖 {details.pageCount} pages
                      </Text>
                    </View>
                  ) : null}

                  {details?.publisher ? (
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#334155' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                        🏢 {details.publisher}
                      </Text>
                    </View>
                  ) : null}

                  {details?.isbn ? (
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#334155' }}>
                      <Text style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
                        ISBN: {details.isbn}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Book Blurb / Synopsis Section */}
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
              <Text style={{ color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>
                Book Overview & Blurb
              </Text>

              {loading ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator color="#38bdf8" size="small" />
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
                    Fetching book blurb and metadata...
                  </Text>
                </View>
              ) : details?.description ? (
                <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22 }}>
                  {details.description}
                </Text>
              ) : (
                <Text style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                  No blurb summary available for this catalog entry.
                </Text>
              )}
            </View>

            {/* FUTURE EXTENSION SLOT: Affiliate Purchase Button (e.g. Amazon / Bookshop.org) */}
            {/*
            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity style={{ backgroundColor: '#ff9900', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#111827', fontWeight: '800' }}>Buy on Amazon (Affiliate Link)</Text>
              </TouchableOpacity>
            </View>
            */}

            {/* Add to Library Action Button */}
            <TouchableOpacity
              onPress={handleAddToLibrary}
              disabled={adding || added}
              style={{
                backgroundColor: added ? '#059669' : '#0284c7',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              {adding ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : added ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15, includeFontPadding: false }}>
                    Added to Your Library!
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15, includeFontPadding: false }}>
                    Add Book to My Library
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
