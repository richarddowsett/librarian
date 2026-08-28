import { VisionAiService } from '../../../ports/outbound/VisionAiService';
import { GeminiAnalysisResult } from '../../../domain/models/BookshelfAi';
import * as geminiService from '../../../services/geminiService';

export class GeminiAdapter implements VisionAiService {
  async analyzeBookshelfImage(base64Data: string, mimeType: string): Promise<GeminiAnalysisResult> {
    return geminiService.analyzeBookshelfImage(base64Data, mimeType);
  }
}
