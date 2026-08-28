import { ExternalMetadataService } from '../../../ports/outbound/ExternalMetadataService';
import { SanitizedBookMetadata } from '../../../domain/models/Book';
import { OpenLibraryListSummary, SeriesDetails } from '../../../domain/models/Series';
import * as googleBooksService from '../../../services/googleBooks';
import * as openLibraryService from '../../../services/openLibrary';
import * as seriesService from '../../../services/series';

export class GoogleBooksAdapter implements ExternalMetadataService {
  async fetchBookByISBN(isbn: string): Promise<SanitizedBookMetadata | null> {
    return googleBooksService.fetchBookByISBN(isbn);
  }

  async fetchAuthorCatalog(authorName: string): Promise<any[]> {
    return googleBooksService.fetchAuthorCatalogFromGoogle(authorName);
  }

  async fetchSeriesCatalog(seriesName: string): Promise<any[]> {
    return googleBooksService.fetchSeriesCatalogFromGoogle(seriesName);
  }

  async searchBooksByTitleAndAuthor(title: string, author?: string): Promise<SanitizedBookMetadata[]> {
    return googleBooksService.searchBooksByTitleAndAuthor(title, author);
  }

  async fetchSeriesDetails(seriesId: string): Promise<SeriesDetails | null> {
    return seriesService.fetchSeriesDetails(seriesId);
  }

  async addOpenLibrarySeriesList(
    userId: string,
    listUrl: string,
    listName?: string,
    workId?: string
  ): Promise<SeriesDetails> {
    return seriesService.addOpenLibrarySeriesList(userId, listUrl, listName || '', workId);
  }

  async fetchWorkLists(workId: string): Promise<OpenLibraryListSummary[]> {
    return openLibraryService.fetchTopListsForWork(workId);
  }
}
