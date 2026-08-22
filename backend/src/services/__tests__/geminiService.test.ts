import { analyzeBookshelfImage, getGeminiApiKey, BOOKSHELF_ANALYSIS_SYSTEM_PROMPT, _resetGeminiApiKeyCache } from '../geminiService';
import { GeminiAnalysisResult } from '../../types';

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn(),
      },
    })),
  };
});

describe('Gemini AI Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetGeminiApiKeyCache();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createMockSecretManagerClient = (secretValue?: string) => {
    return {
      accessSecretVersion: jest.fn().mockImplementation(async () => {
        if (secretValue !== undefined) {
          return [{ payload: { data: Buffer.from(secretValue) } }];
        }
        throw new Error('Secret not found');
      }),
    } as any;
  };

  describe('getGeminiApiKey', () => {
    it('returns API key directly from GEMINI_API_KEY environment variable if present', async () => {
      process.env.GEMINI_API_KEY = 'test-env-api-key-123';
      const key = await getGeminiApiKey();
      expect(key).toBe('test-env-api-key-123');
    });

    it('retrieves API key from Secret Manager when environment variable is not set', async () => {
      delete process.env.GEMINI_API_KEY;

      const mockSecretClient = createMockSecretManagerClient('secret-api-key-from-sm');
      const key = await getGeminiApiKey(mockSecretClient);
      expect(key).toBe('secret-api-key-from-sm');
    });

    it('throws error if neither environment variable nor secret is available', async () => {
      delete process.env.GEMINI_API_KEY;
      const mockSecretClient = createMockSecretManagerClient(undefined);

      await expect(getGeminiApiKey(mockSecretClient)).rejects.toThrow(
        /Gemini API key is not configured/
      );
    });
  });

  describe('analyzeBookshelfImage', () => {
    it('successfully extracts books when Gemini identifies a bookshelf', async () => {
      const { GoogleGenAI } = require('@google/genai');

      const mockGenerateContent = jest.fn().mockResolvedValue({
        text: JSON.stringify({
          is_bookshelf: true,
          guardrail_reason: null,
          extracted_books: [
            {
              title: 'The Hobbit',
              author: 'J.R.R. Tolkien',
              confidence: 0.98,
              spine_location_hint: 'Shelf 1, left',
            },
          ],
        }),
      });

      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const mockSecretClient = createMockSecretManagerClient('valid-key');

      const result: GeminiAnalysisResult = await analyzeBookshelfImage(
        'test-bucket',
        'shelf.jpg',
        {
          apiKey: 'valid-key',
          secretManagerClient: mockSecretClient,
        }
      );

      expect(result.is_bookshelf).toBe(true);
      expect(result.extracted_books.length).toBe(1);
      expect(result.extracted_books[0].title).toBe('The Hobbit');
    });
  });
});
