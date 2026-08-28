import { BookRepository } from '../../../ports/outbound/BookRepository';
import { Book } from '../../../domain/models/Book';
import * as firestoreService from '../../../services/firestoreService';

export class FirestoreBookRepository implements BookRepository {
  async getBooksByOwner(userId: string): Promise<Book[]> {
    return firestoreService.getBooksByOwner(userId);
  }

  async getBookById(userId: string, bookId: string): Promise<Book | null> {
    return firestoreService.getBookById(userId, bookId);
  }

  async addBookForUser(userId: string, bookData: Partial<Book>): Promise<Book> {
    return firestoreService.addBookForUser(userId, bookData);
  }

  async updateBook(userId: string, bookId: string, updates: Partial<Book>): Promise<Book | null> {
    return firestoreService.updateBook(userId, bookId, updates);
  }

  async deleteBook(userId: string, bookId: string): Promise<boolean> {
    return firestoreService.deleteBook(userId, bookId);
  }
}
