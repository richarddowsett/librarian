import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLibrary } from '../../src/context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';

export default function SeriesTrackerScreen() {
  const { seriesOverviews, authorOverviews } = useLibrary();
  const [activeTab, setActiveTab] = useState<'series' | 'authors'>('series');
  const [showUnowned, setShowUnowned] = useState<boolean>(true);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f172a' }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Title Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: '#f8fafc', fontSize: 26, fontWeight: '800' }}>
          {activeTab === 'series' ? 'Series Tracker' : 'Author Collections'}
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>
          {activeTab === 'series'
            ? 'Track series completion, view owned volumes, and discover missing books in your collection.'
            : 'Group and collect all books in your library by author (e.g., Stephen King, Lee Child).'}
        </Text>
      </View>

      {/* Segmented Control / Tab Switcher */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#1e293b',
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#334155',
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab('series')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: activeTab === 'series' ? '#38bdf8' : 'transparent',
          }}
        >
          <Ionicons
            name="layers-outline"
            size={18}
            color={activeTab === 'series' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={{
              color: activeTab === 'series' ? '#0f172a' : '#94a3b8',
              fontWeight: '800',
              fontSize: 14,
            }}
          >
            Book Series ({seriesOverviews.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('authors')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: activeTab === 'authors' ? '#38bdf8' : 'transparent',
          }}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={activeTab === 'authors' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={{
              color: activeTab === 'authors' ? '#0f172a' : '#94a3b8',
              fontWeight: '800',
              fontSize: 14,
            }}
          >
            Author Collections ({authorOverviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Row for Show / Hide Unowned Books */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e293b',
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#334155',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons
            name={showUnowned ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={showUnowned ? '#38bdf8' : '#64748b'}
          />
          <View>
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700' }}>
              Show Unowned / Missing Books
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>
              {showUnowned
                ? 'Displaying missing volumes as greyed-out cards'
                : 'Displaying only owned books'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowUnowned((prev) => !prev)}
          activeOpacity={0.8}
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: showUnowned ? '#38bdf8' : '#334155',
            padding: 3,
            justifyContent: 'center',
            alignItems: showUnowned ? 'flex-end' : 'flex-start',
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: '#f8fafc',
            }}
          />
        </TouchableOpacity>
      </View>

      {/* Tab 1: Series Tracker */}
      {activeTab === 'series' ? (
        seriesOverviews.length > 0 ? (
          <View style={{ gap: 20 }}>
            {seriesOverviews.map((overview) => {
              const hasMissing = overview.missingVolumes.length > 0;
              const completionPercent = Math.round(
                (overview.totalOwned / (overview.maxVolumeOwned || 1)) * 100
              );
              const volumesToDisplay = showUnowned
                ? overview.allVolumes
                : overview.allVolumes.filter((v) => v.isOwned);

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

                  {/* Volumes Carousel */}
                  <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
                    {showUnowned ? 'Series Volumes Sequence:' : 'Owned Volumes in Series:'}
                  </Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {volumesToDisplay.map((volItem) => {
                        const isOwned = volItem.isOwned;
                        const book = volItem.book;

                        return (
                          <View
                            key={`vol-${volItem.volumeNumber}`}
                            style={{
                              width: 105,
                              backgroundColor: '#0f172a',
                              borderRadius: 12,
                              padding: 8,
                              borderWidth: 1,
                              borderColor: isOwned ? '#334155' : '#f59e0b',
                              borderStyle: isOwned ? 'solid' : 'dashed',
                              opacity: isOwned ? 1.0 : 0.5,
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={{
                                width: 88,
                                height: 120,
                                borderRadius: 8,
                                backgroundColor: isOwned ? '#1e293b' : 'rgba(245, 158, 11, 0.08)',
                                overflow: 'hidden',
                                marginBottom: 8,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isOwned && book?.coverUrl ? (
                                <Image
                                  source={{ uri: book.coverUrl }}
                                  style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                                />
                              ) : isOwned ? (
                                <Ionicons name="book" size={28} color="#38bdf8" />
                              ) : (
                                <Ionicons name="help-outline" size={28} color="#fbbf24" />
                              )}
                            </View>

                            <View
                              style={{
                                backgroundColor: isOwned ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                                marginBottom: 4,
                              }}
                            >
                              <Text
                                style={{
                                  color: isOwned ? '#38bdf8' : '#fbbf24',
                                  fontSize: 10,
                                  fontWeight: '800',
                                  textAlign: 'center',
                                }}
                              >
                                {isOwned ? `Vol #${volItem.volumeNumber}` : 'Missing'}
                              </Text>
                            </View>

                            <Text
                              style={{
                                color: isOwned ? '#f8fafc' : '#94a3b8',
                                fontSize: 11,
                                fontWeight: '600',
                                textAlign: 'center',
                              }}
                              numberOfLines={2}
                            >
                              {isOwned && book ? book.title : `Vol #${volItem.volumeNumber}`}
                            </Text>
                          </View>
                        );
                      })}
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
        )
      ) : (
        /* Tab 2: Author Collections */
        authorOverviews.length > 0 ? (
          <View style={{ gap: 20 }}>
            {authorOverviews.map((authorData) => {
              const booksToDisplay = showUnowned
                ? authorData.allBooks
                : authorData.allBooks.filter((b) => b.isOwned);

              return (
                <View
                  key={authorData.authorName}
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
                  {/* Author Header */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: '#0f172a',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#38bdf8',
                        }}
                      >
                        <Ionicons name="person" size={20} color="#38bdf8" />
                      </View>
                      <View>
                        <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800' }}>
                          {authorData.authorName}
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>
                          Author Collection
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        borderColor: '#38bdf8',
                        borderWidth: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 14,
                      }}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800' }}>
                        {authorData.totalOwned} of {authorData.totalKnown || authorData.totalOwned} Books Owned
                      </Text>
                    </View>
                  </View>

                  {/* Author Books Carousel */}
                  <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
                    {showUnowned ? 'Collected & Known Books:' : 'Collected Books in Library:'}
                  </Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {booksToDisplay.map((item) => {
                        const isOwned = item.isOwned;
                        const book = item.book;
                        const statusColor =
                          isOwned && book
                            ? book.readStatus === 'read'
                              ? '#34d399'
                              : book.readStatus === 'reading'
                              ? '#fbbf24'
                              : '#94a3b8'
                            : '#f59e0b';

                        const statusLabel =
                          isOwned && book
                            ? book.readStatus === 'read'
                              ? 'Read'
                              : book.readStatus === 'reading'
                              ? 'Reading'
                              : 'Unread'
                            : 'Missing';

                        return (
                          <View
                            key={item.id}
                            style={{
                              width: 110,
                              backgroundColor: '#0f172a',
                              borderRadius: 12,
                              padding: 8,
                              borderWidth: 1,
                              borderColor: isOwned ? '#334155' : '#f59e0b',
                              borderStyle: isOwned ? 'solid' : 'dashed',
                              opacity: isOwned ? 1.0 : 0.5,
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={{
                                width: 94,
                                height: 130,
                                borderRadius: 8,
                                backgroundColor: isOwned ? '#1e293b' : 'rgba(245, 158, 11, 0.08)',
                                overflow: 'hidden',
                                marginBottom: 8,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {(isOwned && book?.coverUrl) || (!isOwned && item.coverUrl) ? (
                                <Image
                                  source={{ uri: (isOwned && book?.coverUrl) ? book.coverUrl : item.coverUrl! }}
                                  style={{ width: '100%', height: '100%', resizeMode: 'cover', opacity: isOwned ? 1.0 : 0.65 }}
                                />
                              ) : isOwned ? (
                                <Ionicons name="book" size={32} color="#64748b" />
                              ) : (
                                <Ionicons name="help-outline" size={32} color="#fbbf24" />
                              )}
                            </View>
                            <View
                              style={{
                                backgroundColor: `${statusColor}22`,
                                borderColor: statusColor,
                                borderWidth: 1,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 8,
                                marginBottom: 4,
                              }}
                            >
                              <Text
                                style={{
                                  color: statusColor,
                                  fontSize: 10,
                                  fontWeight: '700',
                                }}
                              >
                                {statusLabel}
                              </Text>
                            </View>
                            <Text
                              style={{
                                color: isOwned ? '#f8fafc' : '#94a3b8',
                                fontSize: 11,
                                fontWeight: '600',
                                textAlign: 'center',
                              }}
                              numberOfLines={2}
                            >
                              {item.title}
                            </Text>
                            {item.seriesName ? (
                              <Text
                                style={{
                                  color: '#94a3b8',
                                  fontSize: 10,
                                  textAlign: 'center',
                                  marginTop: 2,
                                }}
                                numberOfLines={1}
                              >
                                {item.seriesName}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
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
            <Ionicons name="person-outline" size={56} color="#64748b" />
            <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 16 }}>
              No Author Collections Found
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
              Add books to your library to automatically aggregate and track your collection by author (e.g. Stephen King, Lee Child)!
            </Text>
          </View>
        )
      )}
    </ScrollView>
  );
}
