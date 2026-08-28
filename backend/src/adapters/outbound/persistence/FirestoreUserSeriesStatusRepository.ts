import { UserSeriesStatusRepository } from '../../../ports/outbound/UserSeriesStatusRepository';
import { UserSeriesStatus } from '../../../domain/models/UserSeriesStatus';
import * as firestoreService from '../../../services/firestoreService';

export class FirestoreUserSeriesStatusRepository implements UserSeriesStatusRepository {
  async getUserSeriesStatus(userId: string, seriesId: string): Promise<UserSeriesStatus | null> {
    return firestoreService.getUserSeriesStatus(userId, seriesId);
  }

  async getAllUserSeriesStatuses(userId: string): Promise<UserSeriesStatus[]> {
    return firestoreService.getAllUserSeriesStatuses(userId);
  }

  async putUserSeriesStatus(status: UserSeriesStatus): Promise<void> {
    await firestoreService.putUserSeriesStatus(status);
  }
}
