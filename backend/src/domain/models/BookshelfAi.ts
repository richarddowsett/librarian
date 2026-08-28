import { SanitizedBookMetadata } from './Book';

export interface ExtractedBook {
  title: string;
  author?: string;
  confidence: number;
  spine_location_hint?: string;
}

export interface GeminiAnalysisResult {
  is_bookshelf: boolean;
  guardrail_reason: string | null;
  extracted_books: ExtractedBook[];
}

export interface BookshelfAnalyzeResponse {
  success: boolean;
  isBookshelf: boolean;
  message?: string;
  candidateBooks: SanitizedBookMetadata[];
  books?: SanitizedBookMetadata[];
}
