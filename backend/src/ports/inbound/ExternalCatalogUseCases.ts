import { SanitizedBookMetadata } from '../../domain/models/Book';
import { OpenLibraryListSummary } from '../../domain/models/Series';

export interface ExternalCatalogUseCases {
  lookupIsbn(isbn: string): Promise<SanitizedBookMetadata | null>;
  searchBooks(title: string, author?: string): Promise<SanitizedBookMetadata[]>;
  fetchAuthorCatalog(authorName: string): Promise<any[]>;
  fetchSeriesCatalog(seriesName: string): Promise<any[]>;
  fetchWorkLists(workId: string): Promise<OpenLibraryListSummary[]>;
}
