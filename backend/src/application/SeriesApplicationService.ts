import { SeriesUseCases } from '../ports/inbound/SeriesUseCases';
import { SeriesRepository } from '../ports/outbound/SeriesRepository';
import { BookRepository } from '../ports/outbound/BookRepository';
import { UserSeriesStatusRepository } from '../ports/outbound/UserSeriesStatusRepository';
import { ExternalMetadataService } from '../ports/outbound/ExternalMetadataService';
import { SeriesDetails, SeriesProgress } from '../domain/models/Series';
import { calculateSeriesProgress } from '../domain/logic/seriesCalculations';

export class SeriesApplicationService implements SeriesUseCases {
  constructor(
    private seriesRepository: SeriesRepository,
    private bookRepository: BookRepository,
    private userStatusRepository: UserSeriesStatusRepository,
    private externalMetadataService: ExternalMetadataService
  ) {}

  async getAllSeries(): Promise<SeriesDetails[]> {
    return this.seriesRepository.getAllSeries();
  }

  async getSeriesById(seriesId: string): Promise<SeriesDetails | null> {
    let series = await this.seriesRepository.getSeriesById(seriesId);
    if (!series && seriesId.startsWith('OL')) {
      series = await this.externalMetadataService.fetchSeriesDetails(seriesId);
      if (series) {
        await this.seriesRepository.putSeries(series);
      }
    }
    return series;
  }

  async saveSeries(seriesData: Partial<SeriesDetails>): Promise<SeriesDetails> {
    const newSeries: SeriesDetails = {
      ...seriesData,
      id: seriesData.id || `series_${Date.now()}`,
      name: seriesData.name || 'Untitled Series',
      volumes: seriesData.volumes || [],
      totalVolumes: seriesData.totalVolumes || (seriesData.volumes ? seriesData.volumes.length : 0),
    };
    await this.seriesRepository.putSeries(newSeries);
    return newSeries;
  }

  async importOpenLibrarySeriesList(
    userId: string,
    listUrl: string,
    listName?: string,
    workId?: string
  ): Promise<SeriesDetails> {
    return this.externalMetadataService.addOpenLibrarySeriesList(userId, listUrl, listName, workId);
  }

  async getSeriesProgress(seriesId: string, userId: string): Promise<SeriesProgress | null> {
    const series = await this.getSeriesById(seriesId);
    if (!series) return null;

    const userBooks = await this.bookRepository.getBooksByOwner(userId);
    const userStatus = await this.userStatusRepository.getUserSeriesStatus(userId, seriesId);

    return calculateSeriesProgress(series, userBooks, userStatus);
  }
}
