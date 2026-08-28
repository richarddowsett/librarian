import { UserSeriesStatus } from '../../domain/models/UserSeriesStatus';

export interface UserSeriesStatusUseCases {
  getUserSeriesStatus(userId: string, seriesId: string): Promise<UserSeriesStatus | null>;
  updateUserSeriesStatus(
    userId: string,
    seriesId: string,
    updates: { isCompleted?: boolean; ignoredVolumes?: string[] }
  ): Promise<UserSeriesStatus>;
}
