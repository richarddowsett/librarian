import { UserSeriesStatusUseCases } from '../ports/inbound/UserSeriesStatusUseCases';
import { UserSeriesStatusRepository } from '../ports/outbound/UserSeriesStatusRepository';
import { UserSeriesStatus } from '../domain/models/UserSeriesStatus';

export class UserSeriesStatusApplicationService implements UserSeriesStatusUseCases {
  constructor(private userStatusRepository: UserSeriesStatusRepository) {}

  async getUserSeriesStatus(userId: string, seriesId: string): Promise<UserSeriesStatus | null> {
    return this.userStatusRepository.getUserSeriesStatus(userId, seriesId);
  }

  async updateUserSeriesStatus(
    userId: string,
    seriesId: string,
    updates: { isCompleted?: boolean; ignoredVolumes?: string[] }
  ): Promise<UserSeriesStatus> {
    const existing = (await this.userStatusRepository.getUserSeriesStatus(userId, seriesId)) || {
      id: `${userId}_${seriesId}`,
      userId,
      seriesId,
      isCompleted: false,
      ignoredVolumes: [],
    };

    const updated: UserSeriesStatus = {
      ...existing,
      isCompleted: typeof updates.isCompleted === 'boolean' ? updates.isCompleted : existing.isCompleted,
      ignoredVolumes: Array.isArray(updates.ignoredVolumes) ? updates.ignoredVolumes : existing.ignoredVolumes,
    };

    await this.userStatusRepository.putUserSeriesStatus(updated);
    return updated;
  }
}
