import { Book } from '../schemas/book';
import { AuthorOverview, AuthorBookItem, SeriesOverview, SeriesVolumeItem } from './LibraryContext';

function computeAuthorOverviews(userBooks: Book[], externalCatalog: Record<string, { title: string; coverUrl?: string }[]> = {}): AuthorOverview[] {
  const authorMap = new Map<string, Book[]>();

  userBooks.forEach((book) => {
    if (Array.isArray(book.authors)) {
      book.authors.forEach((author: string) => {
        const cleanAuthor = author.trim();
        if (cleanAuthor) {
          if (!authorMap.has(cleanAuthor)) {
            authorMap.set(cleanAuthor, []);
          }
          const existingList = authorMap.get(cleanAuthor)!;
          if (!existingList.some((b) => b.id === book.id)) {
            existingList.push(book);
          }
        }
      });
    }
  });

  const result: AuthorOverview[] = [];
  authorMap.forEach((booksForAuthor, authorName) => {
    const sortedOwned = [...booksForAuthor].sort((a, b) => a.title.localeCompare(b.title));
    const allBooks: AuthorBookItem[] = [];

    sortedOwned.forEach((book) => {
      allBooks.push({
        id: book.id || `owned-${book.title}`,
        title: book.title,
        isOwned: true,
        seriesName: book.seriesName || undefined,
        seriesVolumeNumber: book.seriesVolumeNumber || undefined,
        book,
      });
    });

    result.push({
      authorName,
      totalOwned: sortedOwned.length,
      totalKnown: allBooks.length,
      books: sortedOwned,
      allBooks,
    });
  });

  // Augment with external catalog items if available (display-only preview)
  result.forEach((authorOverview) => {
    const catalog = externalCatalog[authorOverview.authorName];
    if (catalog && catalog.length > 0) {
      const existingTitles = new Set(authorOverview.allBooks.map((b) => b.title.trim().toLowerCase()));
      catalog.forEach((catItem, idx) => {
        const cleanTitle = catItem.title.trim().toLowerCase();
        if (!existingTitles.has(cleanTitle)) {
          existingTitles.add(cleanTitle);
          authorOverview.allBooks.push({
            id: `cat-${authorOverview.authorName}-${idx}`,
            title: catItem.title,
            isOwned: false,
            coverUrl: catItem.coverUrl,
          });
        }
      });
      authorOverview.totalKnown = authorOverview.allBooks.length;
    }
  });

  return result.sort((a, b) => b.totalOwned - a.totalOwned);
}

describe('Author & Series Collections Data Isolation', () => {
  it('groups books by author correctly and sorts authors by books owned count', () => {
    const sampleBooks: Book[] = [
      {
        id: 'b1',
        ownerId: 'user-1',
        isbn: '9780307743657',
        title: 'The Shining',
        authors: ['Stephen King'],
        readStatus: 'read',
      },
      {
        id: 'b2',
        ownerId: 'user-1',
        isbn: '9781501142970',
        title: 'It',
        authors: ['Stephen King'],
        readStatus: 'unread',
      },
      {
        id: 'b3',
        ownerId: 'user-1',
        isbn: '9780385543781',
        title: 'The Sentinel',
        authors: ['Lee Child', 'Andrew Child'],
        readStatus: 'reading',
      },
    ];

    const authorOverviews = computeAuthorOverviews(sampleBooks);

    expect(authorOverviews.length).toBe(3);

    // Stephen King should be top because 2 books owned
    expect(authorOverviews[0].authorName).toBe('Stephen King');
    expect(authorOverviews[0].totalOwned).toBe(2);
    expect(authorOverviews[0].books.map((b: Book) => b.title)).toEqual(['It', 'The Shining']);
    expect(authorOverviews[0].allBooks.length).toBe(2);
    expect(authorOverviews[0].allBooks.every((item) => item.isOwned)).toBe(true);

    // Lee Child and Andrew Child have 1 book each
    const leeChild = authorOverviews.find((a: AuthorOverview) => a.authorName === 'Lee Child');
    expect(leeChild).toBeDefined();
    expect(leeChild?.totalOwned).toBe(1);
    expect(leeChild?.books[0].title).toBe('The Sentinel');

    const andrewChild = authorOverviews.find((a: AuthorOverview) => a.authorName === 'Andrew Child');
    expect(andrewChild).toBeDefined();
    expect(andrewChild?.totalOwned).toBe(1);
  });

  it('VERIFIES: Unowned catalog books remain display-only previews and NEVER mutate or get added to user library books', () => {
    const ownedUserBooks: Book[] = [
      {
        id: 'owned-1',
        ownerId: 'user-123',
        isbn: '9780307743657',
        title: 'The Shining',
        authors: ['Stephen King'],
        readStatus: 'read',
      },
    ];

    const externalStephenKingCatalog = [
      { title: 'The Shining' },
      { title: 'It' },
      { title: 'Misery' },
      { title: 'Pet Sematary' },
      { title: 'The Stand' },
    ];

    const authorOverviews = computeAuthorOverviews(ownedUserBooks, {
      'Stephen King': externalStephenKingCatalog,
    });

    const kingOverview = authorOverviews.find((a) => a.authorName === 'Stephen King')!;
    expect(kingOverview).toBeDefined();

    // 1. Owned books count for Stephen King must strictly equal 1
    expect(kingOverview.totalOwned).toBe(1);
    expect(kingOverview.books.length).toBe(1);
    expect(kingOverview.books[0].title).toBe('The Shining');

    // 2. Total known books in author collection is 5 (1 owned + 4 unowned catalog books)
    expect(kingOverview.totalKnown).toBe(5);
    expect(kingOverview.allBooks.length).toBe(5);

    // 3. Unowned catalog books MUST have isOwned === false
    const unownedItems = kingOverview.allBooks.filter((item) => !item.isOwned);
    expect(unownedItems.length).toBe(4);
    expect(unownedItems.map((i) => i.title)).toEqual(['It', 'Misery', 'Pet Sematary', 'The Stand']);

    // 4. CRITICAL CONTRACT: Owned library books list is NOT mutated or contaminated by unowned books
    expect(ownedUserBooks.length).toBe(1);
    expect(ownedUserBooks.map((b) => b.title)).toEqual(['The Shining']);
    expect(ownedUserBooks.some((b) => b.title === 'Misery')).toBe(false);
  });
});
