import { SeriesRepository } from '../../../ports/outbound/SeriesRepository';
import { SeriesDetails } from '../../../domain/models/Series';
import * as firestoreService from '../../../services/firestoreService';

export class FirestoreSeriesRepository implements SeriesRepository {
  async getSeriesById(seriesId: string): Promise<SeriesDetails | null> {
    return firestoreService.getSeriesById(seriesId);
  }

  async getAllSeries(): Promise<SeriesDetails[]> {
    return firestoreService.getAllSeries();
  }

  async putSeries(series: SeriesDetails): Promise<void> {
    await firestoreService.putSeries(series);
  }
}
