import { Book } from '../schemas/book';
import { AuthorOverview } from './LibraryContext';

function computeAuthorOverviews(userBooks: Book[]): AuthorOverview[] {
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
    const sortedBooks = [...booksForAuthor].sort((a, b) => a.title.localeCompare(b.title));
    result.push({
      authorName,
      totalOwned: sortedBooks.length,
      books: sortedBooks,
    });
  });

  return result.sort((a, b) => b.totalOwned - a.totalOwned);
}

describe('Author Collections Aggregation', () => {
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

    // Lee Child and Andrew Child have 1 book each
    const leeChild = authorOverviews.find((a: AuthorOverview) => a.authorName === 'Lee Child');
    expect(leeChild).toBeDefined();
    expect(leeChild?.totalOwned).toBe(1);
    expect(leeChild?.books[0].title).toBe('The Sentinel');

    const andrewChild = authorOverviews.find((a: AuthorOverview) => a.authorName === 'Andrew Child');
    expect(andrewChild).toBeDefined();
    expect(andrewChild?.totalOwned).toBe(1);
  });
});
