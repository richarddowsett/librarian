import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useLibrary } from '../../src/context/LibraryContext';
import { BookCard } from '../../src/components/BookCard';
import { BookDetailModal } from '../../src/components/BookDetailModal';
import { BookFormModal } from '../../src/components/BookFormModal';
import { DoIOwnModal } from '../../src/components/DoIOwnModal';
import { PullToRefreshScrollView } from '../../src/components/PullToRefreshScrollView';
import { Book } from '../../src/schemas/book';
import { Ionicons } from '@expo/vector-icons';

export default function LibraryCatalogScreen() {
  const {
    filteredBooks,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    stats,
    refreshing,
    refreshLibrary,
  } = useLibrary();

  const { width } = useWindowDimensions();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isDoIOwnModalOpen, setIsDoIOwnModalOpen] = useState<boolean>(false);
  const [editBookData, setEditBookData] = useState<Book | null>(null);

  // Compute number of grid columns based on width
  const getNumColumns = () => {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
  };

  const columns = getNumColumns();
  const cardWidth = `${100 / columns}%` as any;

  const handleCardPress = (book: Book) => {
    setSelectedBook(book);
    setIsDetailModalOpen(true);
  };

  const handleEditBook = (book: Book) => {
    setEditBookData(book);
    setIsFormModalOpen(true);
  };

  const filterTabs: { label: string; value: 'all' | 'unread' | 'reading' | 'read'; count: number }[] = [
    { label: 'All Books', value: 'all', count: stats.totalBooks },
    { label: 'Unread', value: 'unread', count: stats.unreadCount },
    { label: 'In Progress', value: 'reading', count: stats.readingCount },
    { label: 'Read', value: 'read', count: stats.readCount },
  ];

  return (
    <PullToRefreshScrollView
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshing={refreshing}
      onRefresh={refreshLibrary}
    >
      {/* Header & Stats Summary */}
      <View
        style={{
          flexDirection: width < 520 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: width < 520 ? 'flex-start' : 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <View style={{ flex: width < 520 ? undefined : 1 }}>
          <Text style={{ color: '#f8fafc', fontSize: 26, fontWeight: '800', includeFontPadding: false }}>
            My Library Catalogue
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2, includeFontPadding: false }}>
            Manage your physical collection, track reading progress, and log reviews.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsDoIOwnModalOpen(true)}
          style={{
            backgroundColor: '#0284c7',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            alignSelf: width < 520 ? 'flex-start' : 'auto',
            shadowColor: '#0284c7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Ionicons name="storefront" size={18} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14, includeFontPadding: false }}>
            Do I Own This?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats Badges */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 130,
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', includeFontPadding: false }}>TOTAL BOOKS</Text>
          <Text style={{ color: '#f8fafc', fontSize: 22, fontWeight: '800', marginTop: 4, includeFontPadding: false }}>
            {stats.totalBooks}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 130,
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', includeFontPadding: false }}>COMPLETED READ</Text>
          <Text style={{ color: '#059669', fontSize: 22, fontWeight: '800', marginTop: 4, includeFontPadding: false }}>
            {stats.readCount}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 130,
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', includeFontPadding: false }}>IN PROGRESS</Text>
          <Text style={{ color: '#38bdf8', fontSize: 22, fontWeight: '800', marginTop: 4, includeFontPadding: false }}>
            {stats.readingCount}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 130,
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', includeFontPadding: false }}>AVG RATING</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ color: '#f59e0b', fontSize: 22, fontWeight: '800', includeFontPadding: false }}>
              {stats.avgRating > 0 ? stats.avgRating : 'N/A'}
            </Text>
            {stats.avgRating > 0 && <Ionicons name="star" size={18} color="#f59e0b" />}
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1e293b',
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: '#334155',
          marginBottom: 16,
        }}
      >
        <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by title, author, or ISBN..."
          placeholderTextColor="#64748b"
          style={{ flex: 1, color: '#f8fafc', fontSize: 15 }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {filterTabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setStatusFilter(tab.value)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isActive ? '#0284c7' : '#1e293b',
                borderWidth: 1,
                borderColor: isActive ? '#0284c7' : '#334155',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '500',
                  includeFontPadding: false,
                }}
              >
                {tab.label}
              </Text>
              <View
                style={{
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#0f172a',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontSize: 11,
                    fontWeight: '700',
                    includeFontPadding: false,
                  }}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Book Grid */}
      {filteredBooks.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
          {filteredBooks.map((book) => (
            <View key={book.id} style={{ width: cardWidth, padding: 8 }}>
              <BookCard book={book} onPress={handleCardPress} />
            </View>
          ))}
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
          <Ionicons name="journal-outline" size={56} color="#64748b" />
          <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 16 }}>
            No books found
          </Text>
          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              textAlign: 'center',
              marginTop: 6,
              maxWidth: 360,
            }}
          >
            {searchQuery
              ? `No books matching "${searchQuery}". Try clearing your search.`
              : 'Your library is currently empty under this filter. Scan a book barcode to add your first book!'}
          </Text>
        </View>
      )}

      {/* Modals */}
      <BookDetailModal
        book={selectedBook}
        visible={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      <BookFormModal
        visible={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editBookData}
      />

      <DoIOwnModal
        visible={isDoIOwnModalOpen}
        onClose={() => setIsDoIOwnModalOpen(false)}
      />
    </PullToRefreshScrollView>
  );
}
