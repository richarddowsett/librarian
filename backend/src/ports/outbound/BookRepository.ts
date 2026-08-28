import { Book } from '../../domain/models/Book';

export interface BookRepository {
  getBooksByOwner(userId: string): Promise<Book[]>;
  getBookById(userId: string, bookId: string): Promise<Book | null>;
  addBookForUser(userId: string, bookData: Partial<Book>): Promise<Book>;
  updateBook(userId: string, bookId: string, updates: Partial<Book>): Promise<Book | null>;
  deleteBook(userId: string, bookId: string): Promise<boolean>;
}
