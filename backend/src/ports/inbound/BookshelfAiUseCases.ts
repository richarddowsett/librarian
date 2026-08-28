import { BookshelfAnalyzeResponse } from '../../domain/models/BookshelfAi';

export interface BookshelfAiUseCases {
  generateUploadSignedUrl(
    userId: string,
    fileExtension?: string,
    contentType?: string
  ): Promise<{ uploadUrl: string; objectPath: string; fileName: string }>;

  analyzeBookshelfPhoto(objectPath: string): Promise<BookshelfAnalyzeResponse>;
}
