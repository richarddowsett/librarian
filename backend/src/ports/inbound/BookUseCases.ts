import { Book } from '../../domain/models/Book';

export interface BookUseCases {
  getBooks(userId: string): Promise<Book[]>;
  getBookById(userId: string, bookId: string): Promise<Book | null>;
  addBook(userId: string, bookData: Partial<Book>): Promise<Book>;
  updateBook(userId: string, bookId: string, updates: Partial<Book>): Promise<Book | null>;
  deleteBook(userId: string, bookId: string): Promise<boolean>;
}
