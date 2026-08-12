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

  const createMockS3Client = (imageBytes: Uint8Array = new Uint8Array([1, 2, 3])) => {
    return {
      send: jest.fn().mockResolvedValue({
        Body: {
          transformToByteArray: jest.fn().mockResolvedValue(imageBytes),
        },
        ContentType: 'image/jpeg',
      }),
    } as any;
  };

  const createMockSecretsClient = (secretValue?: string) => {
    return {
      send: jest.fn().mockImplementation((command) => {
        if (secretValue !== undefined) {
          return Promise.resolve({ SecretString: secretValue });
        }
        return Promise.reject(new Error('Secret not found'));
      }),
    } as any;
  };

  describe('getGeminiApiKey', () => {
    it('returns API key directly from GEMINI_API_KEY environment variable if present', async () => {
      process.env.GEMINI_API_KEY = 'test-env-api-key-123';
      const key = await getGeminiApiKey();
      expect(key).toBe('test-env-api-key-123');
    });

    it('retrieves API key from Secrets Manager when environment variable is not set', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.GEMINI_SECRET_NAME = 'librarian/gemini-api-key';

      const mockSecretsClient = createMockSecretsClient('secret-api-key-from-sm');
      const key = await getGeminiApiKey(mockSecretsClient);

      expect(mockSecretsClient.send).toHaveBeenCalled();
      expect(key).toBe('secret-api-key-from-sm');
    });

    it('throws error when no API key is available in env or Secrets Manager', async () => {
      delete process.env.GEMINI_API_KEY;
      const mockSecretsClient = createMockSecretsClient(undefined);

      await expect(getGeminiApiKey(mockSecretsClient)).rejects.toThrow(
        /Gemini API key is not configured/
      );
    });
  });

  describe('analyzeBookshelfImage', () => {
    it('successfully downloads S3 object and invokes Gemini 2.5 Flash for valid bookshelf image', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const mockGeminiResult: GeminiAnalysisResult = {
        is_bookshelf: true,
        guardrail_reason: null,
        extracted_books: [
          { title: 'The Hobbit', author: 'J.R.R. Tolkien', confidence: 0.98, spine_location_hint: 'top shelf' },
          { title: 'Dune', author: 'Frank Herbert', confidence: 0.95 },
        ],
      };

      const { GoogleGenAI } = require('@google/genai');
      const mockGenerateContent = jest.fn().mockResolvedValue({
        text: JSON.stringify(mockGeminiResult),
      });
      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const mockS3 = createMockS3Client();

      const result = await analyzeBookshelfImage('test-bucket', 'uploads/shelf.jpg', {
        s3Client: mockS3,
        apiKey: 'test-gemini-key',
      });

      expect(mockS3.send).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe('gemini-2.5-flash');
      expect(callArgs.config.systemInstruction).toBe(BOOKSHELF_ANALYSIS_SYSTEM_PROMPT);
      expect(callArgs.config.responseMimeType).toBe('application/json');

      expect(result.is_bookshelf).toBe(true);
      expect(result.extracted_books).toHaveLength(2);
      expect(result.extracted_books[0].title).toBe('The Hobbit');
    });

    it('correctly handles non-bookshelf photos rejected by Gemini guardrail', async () => {
      const mockNonBookshelfResult = {
        is_bookshelf: false,
        guardrail_reason: 'Photo shows a cat sitting on a couch.',
        extracted_books: [],
      };

      const { GoogleGenAI } = require('@google/genai');
      const mockGenerateContent = jest.fn().mockResolvedValue({
        text: JSON.stringify(mockNonBookshelfResult),
      });
      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const mockS3 = createMockS3Client();

      const result = await analyzeBookshelfImage('test-bucket', 'uploads/cat.jpg', {
        s3Client: mockS3,
        apiKey: 'test-gemini-key',
      });

      expect(result.is_bookshelf).toBe(false);
      expect(result.guardrail_reason).toBe('Photo shows a cat sitting on a couch.');
      expect(result.extracted_books).toEqual([]);
    });

    it('parses markdown wrapped JSON block gracefully from Gemini output', async () => {
      const mockResult = {
        is_bookshelf: true,
        guardrail_reason: null,
        extracted_books: [{ title: '1984', author: 'George Orwell', confidence: 0.9 }],
      };

      const rawMarkdownText = `\`\`\`json\n${JSON.stringify(mockResult)}\n\`\`\``;

      const { GoogleGenAI } = require('@google/genai');
      const mockGenerateContent = jest.fn().mockResolvedValue({ text: rawMarkdownText });
      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const mockS3 = createMockS3Client();

      const result = await analyzeBookshelfImage('test-bucket', 'uploads/shelf.jpg', {
        s3Client: mockS3,
        apiKey: 'test-gemini-key',
      });

      expect(result.is_bookshelf).toBe(true);
      expect(result.extracted_books[0].title).toBe('1984');
    });

    it('throws error when Gemini output is not valid JSON', async () => {
      const { GoogleGenAI } = require('@google/genai');
      const mockGenerateContent = jest.fn().mockResolvedValue({ text: 'INVALID_NON_JSON_RESPONSE' });
      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const mockS3 = createMockS3Client();

      await expect(
        analyzeBookshelfImage('test-bucket', 'uploads/shelf.jpg', {
          s3Client: mockS3,
          apiKey: 'test-gemini-key',
        })
      ).rejects.toThrow(/Failed to parse structured JSON from Gemini model output/);
    });
  });
});
