import { BookUseCases } from '../ports/inbound/BookUseCases';
import { BookRepository } from '../ports/outbound/BookRepository';
import { Book } from '../domain/models/Book';

export class BookApplicationService implements BookUseCases {
  constructor(private bookRepository: BookRepository) {}

  async getBooks(userId: string): Promise<Book[]> {
    return this.bookRepository.getBooksByOwner(userId);
  }

  async getBookById(userId: string, bookId: string): Promise<Book | null> {
    return this.bookRepository.getBookById(userId, bookId);
  }

  async addBook(userId: string, bookData: Partial<Book>): Promise<Book> {
    return this.bookRepository.addBookForUser(userId, bookData);
  }

  async updateBook(userId: string, bookId: string, updates: Partial<Book>): Promise<Book | null> {
    return this.bookRepository.updateBook(userId, bookId, updates);
  }

  async deleteBook(userId: string, bookId: string): Promise<boolean> {
    return this.bookRepository.deleteBook(userId, bookId);
  }
}
