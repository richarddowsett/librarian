import { GeminiAnalysisResult } from '../../domain/models/BookshelfAi';

export interface VisionAiService {
  analyzeBookshelfImage(base64Data: string, mimeType: string): Promise<GeminiAnalysisResult>;
}
