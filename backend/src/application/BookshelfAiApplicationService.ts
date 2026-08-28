import { BookshelfAiUseCases } from '../ports/inbound/BookshelfAiUseCases';
import { BookshelfImageStorage } from '../ports/outbound/BookshelfImageStorage';
import { VisionAiService } from '../ports/outbound/VisionAiService';
import { ExternalMetadataService } from '../ports/outbound/ExternalMetadataService';
import { BookshelfAnalyzeResponse } from '../domain/models/BookshelfAi';
import { SanitizedBookMetadata } from '../domain/models/Book';

export class BookshelfAiApplicationService implements BookshelfAiUseCases {
  constructor(
    private imageStorage: BookshelfImageStorage,
    private visionAiService: VisionAiService,
    private externalMetadataService: ExternalMetadataService
  ) {}

  async generateUploadSignedUrl(
    userId: string,
    fileExtension?: string,
    contentType?: string
  ): Promise<{ uploadUrl: string; objectPath: string; fileName: string }> {
    return this.imageStorage.generateSignedUploadUrl(userId, fileExtension, contentType);
  }

  async analyzeBookshelfPhoto(objectPath: string): Promise<BookshelfAnalyzeResponse> {
    const { base64Data, mimeType } = await this.imageStorage.downloadImageAsBase64(objectPath);
    const aiResult = await this.visionAiService.analyzeBookshelfImage(base64Data, mimeType);

    if (!aiResult.is_bookshelf) {
      return {
        success: false,
        isBookshelf: false,
        message: aiResult.guardrail_reason || 'Image does not appear to contain a bookshelf.',
        candidateBooks: [],
      };
    }

    const candidateBooks: SanitizedBookMetadata[] = [];
    const extractedList = aiResult.extracted_books || [];

    for (const item of extractedList) {
      if (!item.title) continue;
      const searchResults = await this.externalMetadataService.searchBooksByTitleAndAuthor(item.title, item.author);
      if (searchResults && searchResults.length > 0) {
        candidateBooks.push(searchResults[0]);
      } else {
        candidateBooks.push({
          isbn: '',
          title: item.title,
          subtitle: null,
          authors: item.author ? [item.author] : ['Unknown Author'],
          coverUrl: null,
          publisher: 'Unknown Publisher',
          publishDate: 'Unknown',
          pageCount: 0,
          description: null,
          categories: null,
          language: 'en',
          workKey: null,
        });
      }
    }

    return {
      success: true,
      isBookshelf: true,
      candidateBooks,
      books: candidateBooks,
    };
  }
}
