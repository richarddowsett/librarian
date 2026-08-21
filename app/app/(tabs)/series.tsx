import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLibrary } from '../../src/context/LibraryContext';
import { Book } from '../../src/schemas/book';
import { Ionicons } from '@expo/vector-icons';
import { BookDetailModal } from '../../src/components/BookDetailModal';
import { UnownedBookModal } from '../../src/components/UnownedBookModal';
import { PullToRefreshScrollView } from '../../src/components/PullToRefreshScrollView';

export default function SeriesTrackerScreen() {
  const { seriesOverviews, authorOverviews, refreshing, refreshLibrary } = useLibrary();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'series' | 'authors'>('series');
  const [showUnowned, setShowUnowned] = useState<boolean>(true);
  const [selectedOwnedBook, setSelectedOwnedBook] = useState<Book | null>(null);
  const [selectedUnownedBook, setSelectedUnownedBook] = useState<{
    title: string;
    authorName?: string;
    seriesName?: string;
    seriesVolumeNumber?: number;
    coverUrl?: string;
    workId?: string;
    isbn?: string;
  } | null>(null);

  const isSmallScreen = width < 420;

  return (
    <PullToRefreshScrollView
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshing={refreshing}
      onRefresh={refreshLibrary}
    >
      {/* Title Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: '#f8fafc', fontSize: 26, fontWeight: '800', includeFontPadding: false }}>
          {activeTab === 'series' ? 'Series Tracker' : 'Author Collections'}
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2, includeFontPadding: false }}>
          {activeTab === 'series'
            ? 'Track series completion, view owned volumes, and discover missing books in your collection.'
            : 'Group and collect all books in your library by author (e.g., Stephen King, Lee Child).'}
        </Text>
      </View>

      {/* Segmented Control / Tab Switcher */}
      <View
        style={{
          flexDirection: isSmallScreen ? 'column' : 'row',
          backgroundColor: '#1e293b',
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#334155',
          gap: 4,
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab('series')}
          style={{
            flex: isSmallScreen ? undefined : 1,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderRadius: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: isSmallScreen ? 6 : 8,
            backgroundColor: activeTab === 'series' ? '#38bdf8' : 'transparent',
          }}
        >
          <Ionicons
            name="layers-outline"
            size={isSmallScreen ? 16 : 18}
            color={activeTab === 'series' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            numberOfLines={1}
            style={{
              color: activeTab === 'series' ? '#0f172a' : '#94a3b8',
              fontWeight: '800',
              fontSize: isSmallScreen ? 13 : 14,
              includeFontPadding: false,
              flexShrink: 1,
            }}
          >
            Book Series ({seriesOverviews.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('authors')}
          style={{
            flex: isSmallScreen ? undefined : 1,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderRadius: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: isSmallScreen ? 6 : 8,
            backgroundColor: activeTab === 'authors' ? '#38bdf8' : 'transparent',
          }}
        >
          <Ionicons
            name="person-outline"
            size={isSmallScreen ? 16 : 18}
            color={activeTab === 'authors' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            numberOfLines={1}
            style={{
              color: activeTab === 'authors' ? '#0f172a' : '#94a3b8',
              fontWeight: '800',
              fontSize: isSmallScreen ? 13 : 14,
              includeFontPadding: false,
              flexShrink: 1,
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
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Ionicons
            name={showUnowned ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={showUnowned ? '#38bdf8' : '#64748b'}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700', includeFontPadding: false }}>
              Show Unowned / Missing Books
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 1, includeFontPadding: false }}>
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
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800', includeFontPadding: false }}>
                        {overview.seriesName}
                      </Text>
                      <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2, includeFontPadding: false }}>
                        Owned {overview.totalOwned} of {overview.maxVolumeOwned} books in series list
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
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: hasMissing ? '#fbbf24' : '#34d399',
                          fontSize: 12,
                          fontWeight: '800',
                          includeFontPadding: false,
                        }}
                      >
                        {hasMissing ? `${overview.missingVolumes.length} Unowned` : 'Collection Complete!'}
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
                      <Ionicons name="alert-circle-outline" size={20} color="#fbbf24" />
                      <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '600', flex: 1 }}>
                        {overview.missingVolumes.length} unowned {overview.missingVolumes.length === 1 ? 'book' : 'books'} in this list. Tap any card below to preview & add to library.
                      </Text>
                    </View>
                  )}

                  {/* Volumes Carousel */}
                  <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
                    {showUnowned ? 'Series Books Collection:' : 'Owned Books in Series:'}
                  </Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {volumesToDisplay.map((volItem) => {
                        const isOwned = volItem.isOwned;
                        const book = volItem.book;

                        return (
                          <TouchableOpacity
                            key={volItem.book?.id || `${volItem.title}-${volItem.volumeNumber}`}
                            activeOpacity={0.7}
                            onPress={() => {
                              if (isOwned && book) {
                                setSelectedOwnedBook(book);
                              } else {
                                const unownedAuthor = (volItem.authors && volItem.authors.length > 0)
                                  ? volItem.authors.join(', ')
                                  : (volItem.book?.authors?.join(', ') || overview.books[0]?.authors?.join(', '));

                                setSelectedUnownedBook({
                                  title: volItem.title,
                                  authorName: unownedAuthor,
                                  seriesName: overview.seriesName,
                                  seriesVolumeNumber: volItem.volumeNumber,
                                  coverUrl: volItem.coverUrl,
                                  workId: volItem.workId,
                                  isbn: volItem.isbn,
                                });
                              }
                            }}
                            style={{
                              width: 105,
                              backgroundColor: '#0f172a',
                              borderRadius: 12,
                              padding: 8,
                              borderWidth: 1,
                              borderColor: isOwned ? '#334155' : '#f59e0b',
                              borderStyle: isOwned ? 'solid' : 'dashed',
                              opacity: isOwned ? 1.0 : 0.65,
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
                              {(isOwned && book?.coverUrl) || (!isOwned && volItem.coverUrl) ? (
                                <Image
                                  source={{ uri: (isOwned && book?.coverUrl) ? book.coverUrl : volItem.coverUrl! }}
                                  style={{ width: '100%', height: '100%', resizeMode: 'cover', opacity: isOwned ? 1.0 : 0.7 }}
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
                                {isOwned ? 'Owned ✓' : 'Unowned'}
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
                              {isOwned && book ? book.title : volItem.title}
                            </Text>
                          </TouchableOpacity>
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
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
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
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800', includeFontPadding: false }}>
                          {authorData.authorName}
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2, includeFontPadding: false }}>
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
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800', includeFontPadding: false }}>
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
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.7}
                            onPress={() => {
                              if (isOwned && book) {
                                setSelectedOwnedBook(book);
                              } else {
                                setSelectedUnownedBook({
                                  title: item.title,
                                  authorName: authorData.authorName,
                                  seriesName: item.seriesName,
                                  seriesVolumeNumber: item.seriesVolumeNumber,
                                  coverUrl: item.coverUrl,
                                });
                              }
                            }}
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
                          </TouchableOpacity>
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

      {/* Owned Book Details Modal */}
      <BookDetailModal
        book={selectedOwnedBook}
        visible={!!selectedOwnedBook}
        onClose={() => setSelectedOwnedBook(null)}
      />

      {/* Unowned Book Details & Blurb Modal */}
      <UnownedBookModal
        visible={!!selectedUnownedBook}
        onClose={() => setSelectedUnownedBook(null)}
        title={selectedUnownedBook?.title || ''}
        authorName={selectedUnownedBook?.authorName}
        seriesName={selectedUnownedBook?.seriesName}
        seriesVolumeNumber={selectedUnownedBook?.seriesVolumeNumber}
        initialCoverUrl={selectedUnownedBook?.coverUrl}
        workId={selectedUnownedBook?.workId}
        isbn={selectedUnownedBook?.isbn}
      />
    </PullToRefreshScrollView>
  );
}
