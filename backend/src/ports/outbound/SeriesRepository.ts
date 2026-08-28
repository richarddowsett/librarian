import { SeriesDetails } from '../../domain/models/Series';

export interface SeriesRepository {
  getSeriesById(seriesId: string): Promise<SeriesDetails | null>;
  getAllSeries(): Promise<SeriesDetails[]>;
  putSeries(series: SeriesDetails): Promise<void>;
}
