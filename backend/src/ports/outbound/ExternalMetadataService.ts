import { SanitizedBookMetadata } from '../../domain/models/Book';
import { OpenLibraryListSummary, SeriesDetails } from '../../domain/models/Series';

export interface ExternalMetadataService {
  fetchBookByISBN(isbn: string): Promise<SanitizedBookMetadata | null>;
  fetchAuthorCatalog(authorName: string): Promise<any[]>;
  fetchSeriesCatalog(seriesName: string): Promise<any[]>;
  searchBooksByTitleAndAuthor(title: string, author?: string): Promise<SanitizedBookMetadata[]>;
  fetchSeriesDetails(seriesId: string): Promise<SeriesDetails | null>;
  addOpenLibrarySeriesList(
    userId: string,
    listUrl: string,
    listName?: string,
    workId?: string
  ): Promise<SeriesDetails>;
  fetchWorkLists(workId: string): Promise<OpenLibraryListSummary[]>;
}
