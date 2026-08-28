import { FirestoreBookRepository } from '../adapters/outbound/persistence/FirestoreBookRepository';
import { FirestoreSeriesRepository } from '../adapters/outbound/persistence/FirestoreSeriesRepository';
import { FirestoreUserSeriesStatusRepository } from '../adapters/outbound/persistence/FirestoreUserSeriesStatusRepository';
import { GoogleBooksAdapter } from '../adapters/outbound/external/GoogleBooksAdapter';
import { GcsStorageAdapter } from '../adapters/outbound/external/GcsStorageAdapter';
import { GeminiAdapter } from '../adapters/outbound/external/GeminiAdapter';

import { BookApplicationService } from '../application/BookApplicationService';
import { SeriesApplicationService } from '../application/SeriesApplicationService';
import { UserSeriesStatusApplicationService } from '../application/UserSeriesStatusApplicationService';
import { ExternalCatalogApplicationService } from '../application/ExternalCatalogApplicationService';
import { BookshelfAiApplicationService } from '../application/BookshelfAiApplicationService';

export class Container {
  // Outbound Driven Adapters
  readonly bookRepository = new FirestoreBookRepository();
  readonly seriesRepository = new FirestoreSeriesRepository();
  readonly userStatusRepository = new FirestoreUserSeriesStatusRepository();
  readonly externalMetadataService = new GoogleBooksAdapter();
  readonly imageStorage = new GcsStorageAdapter();
  readonly visionAiService = new GeminiAdapter();

  // Inbound Application Services (Use Cases)
  readonly bookUseCases = new BookApplicationService(this.bookRepository);
  readonly seriesUseCases = new SeriesApplicationService(
    this.seriesRepository,
    this.bookRepository,
    this.userStatusRepository,
    this.externalMetadataService
  );
  readonly userStatusUseCases = new UserSeriesStatusApplicationService(this.userStatusRepository);
  readonly externalCatalogUseCases = new ExternalCatalogApplicationService(this.externalMetadataService);
  readonly bookshelfAiUseCases = new BookshelfAiApplicationService(
    this.imageStorage,
    this.visionAiService,
    this.externalMetadataService
  );
}

export const container = new Container();
