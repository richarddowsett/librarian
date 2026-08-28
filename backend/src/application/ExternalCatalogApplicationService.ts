import { ExternalCatalogUseCases } from '../ports/inbound/ExternalCatalogUseCases';
import { ExternalMetadataService } from '../ports/outbound/ExternalMetadataService';
import { SanitizedBookMetadata } from '../domain/models/Book';
import { OpenLibraryListSummary } from '../domain/models/Series';

export class ExternalCatalogApplicationService implements ExternalCatalogUseCases {
  constructor(private externalMetadataService: ExternalMetadataService) {}

  async lookupIsbn(isbn: string): Promise<SanitizedBookMetadata | null> {
    return this.externalMetadataService.fetchBookByISBN(isbn);
  }

  async searchBooks(title: string, author?: string): Promise<SanitizedBookMetadata[]> {
    return this.externalMetadataService.searchBooksByTitleAndAuthor(title, author);
  }

  async fetchAuthorCatalog(authorName: string): Promise<any[]> {
    return this.externalMetadataService.fetchAuthorCatalog(authorName);
  }

  async fetchSeriesCatalog(seriesName: string): Promise<any[]> {
    return this.externalMetadataService.fetchSeriesCatalog(seriesName);
  }

  async fetchWorkLists(workId: string): Promise<OpenLibraryListSummary[]> {
    return this.externalMetadataService.fetchWorkLists(workId);
  }
}
