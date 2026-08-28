export interface UserSeriesStatus {
  id: string;
  userId: string;
  seriesId: string;
  isCompleted: boolean;
  ignoredVolumes: string[];
}
