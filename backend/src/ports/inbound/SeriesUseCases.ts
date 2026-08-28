import { SeriesDetails, SeriesProgress } from '../../domain/models/Series';

export interface SeriesUseCases {
  getAllSeries(): Promise<SeriesDetails[]>;
  getSeriesById(seriesId: string): Promise<SeriesDetails | null>;
  saveSeries(seriesData: Partial<SeriesDetails>): Promise<SeriesDetails>;
  importOpenLibrarySeriesList(
    userId: string,
    listUrl: string,
    listName?: string,
    workId?: string
  ): Promise<SeriesDetails>;
  getSeriesProgress(seriesId: string, userId: string): Promise<SeriesProgress | null>;
}
