import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLibrary } from '../../src/context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';

export default function SeriesTrackerScreen() {
  const { seriesOverviews } = useLibrary();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f172a' }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: '#f8fafc', fontSize: 26, fontWeight: '800' }}>
          Series Tracker
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>
          Track series completion, view owned volumes, and discover missing books in your collection.
        </Text>
      </View>

      {seriesOverviews.length > 0 ? (
        <View style={{ gap: 20 }}>
          {seriesOverviews.map((overview) => {
            const hasMissing = overview.missingVolumes.length > 0;
            const completionPercent = Math.round(
              (overview.totalOwned / (overview.maxVolumeOwned || 1)) * 100
            );

            return (
              <View
                key={overview.seriesId}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#334155',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                {/* Series Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <View>
                    <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800' }}>
                      {overview.seriesName}
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>
                      Owned {overview.totalOwned} of {overview.maxVolumeOwned} volumes in sequence
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: hasMissing ? 'rgba(245, 158, 11, 0.15)' : 'rgba(5, 150, 105, 0.15)',
                      borderColor: hasMissing ? '#f59e0b' : '#059669',
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 14,
                    }}
                  >
                    <Text
                      style={{
                        color: hasMissing ? '#fbbf24' : '#34d399',
                        fontSize: 12,
                        fontWeight: '800',
                      }}
                    >
                      {hasMissing ? `${overview.missingVolumes.length} Missing` : 'Sequence Intact!'}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: '#0f172a',
                      borderRadius: 4,
                      overflow: 'hidden',
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(100, completionPercent)}%`,
                        backgroundColor: hasMissing ? '#f59e0b' : '#059669',
                        borderRadius: 4,
                      }}
                    />
                  </View>
                </View>

                {/* Missing Volumes Warning */}
                {hasMissing && (
                  <View
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      borderColor: '#f59e0b',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="warning-outline" size={20} color="#fbbf24" />
                    <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '600', flex: 1 }}>
                      Missing Volumes: Vol {overview.missingVolumes.join(', Vol ')}
                    </Text>
                  </View>
                )}

                {/* Owned Volumes Carousel / Grid */}
                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
                  Owned Volumes in Series:
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {overview.books.map((book) => (
                      <View
                        key={book.id}
                        style={{
                          width: 100,
                          backgroundColor: '#0f172a',
                          borderRadius: 12,
                          padding: 8,
                          borderWidth: 1,
                          borderColor: '#334155',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: 84,
                            height: 120,
                            borderRadius: 8,
                            backgroundColor: '#1e293b',
                            overflow: 'hidden',
                            marginBottom: 8,
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
                            <Ionicons name="book" size={28} color="#64748b" />
                          )}
                        </View>
                        <Text
                          style={{
                            color: '#38bdf8',
                            fontSize: 11,
                            fontWeight: '800',
                            textAlign: 'center',
                          }}
                        >
                          Vol #{book.seriesVolumeNumber || '?'}
                        </Text>
                        <Text
                          style={{
                            color: '#f8fafc',
                            fontSize: 11,
                            fontWeight: '600',
                            textAlign: 'center',
                            marginTop: 2,
                          }}
                          numberOfLines={2}
                        >
                          {book.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            );
          })}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 20,
            padding: 40,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#334155',
            marginVertical: 20,
          }}
        >
          <Ionicons name="layers-outline" size={56} color="#64748b" />
          <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 16 }}>
            No Book Series Logged Yet
          </Text>
          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              textAlign: 'center',
              marginTop: 6,
              maxWidth: 400,
            }}
          >
            Add books with series information (e.g. Harry Potter, Dune, Mistborn) to automatically track missing volumes!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
