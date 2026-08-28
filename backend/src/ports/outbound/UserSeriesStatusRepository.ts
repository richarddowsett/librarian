import { UserSeriesStatus } from '../../domain/models/UserSeriesStatus';

export interface UserSeriesStatusRepository {
  getUserSeriesStatus(userId: string, seriesId: string): Promise<UserSeriesStatus | null>;
  getAllUserSeriesStatuses(userId: string): Promise<UserSeriesStatus[]>;
  putUserSeriesStatus(status: UserSeriesStatus): Promise<void>;
}
