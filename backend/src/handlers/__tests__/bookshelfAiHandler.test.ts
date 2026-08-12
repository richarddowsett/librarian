import { handler } from '../bookshelfAiHandler';
import * as bedrockService from '../../services/bedrockService';
import * as bookSearchService from '../../services/bookSearchService';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/test-presigned-url'),
}));

describe('Bookshelf AI Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createEvent = (method: string, path: string, body?: any) => {
    return {
      rawPath: path,
      requestContext: {
        http: {
          method,
          path,
        },
      },
      body: body ? JSON.stringify(body) : null,
    } as any;
  };

  it('handles OPTIONS CORS preflight requests', async () => {
    const event = createEvent('OPTIONS', '/bookshelf/presigned-url');
    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
  });

  it('returns 405 Method Not Allowed for non-POST/OPTIONS requests', async () => {
    const event = createEvent('GET', '/bookshelf/analyze');
    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(405);
    const body = JSON.parse(result.body as string);
    expect(body.error).toBe('Method Not Allowed');
  });

  describe('POST /bookshelf/presigned-url', () => {
    it('returns 400 if contentType parameter is missing', async () => {
      const event = createEvent('POST', '/bookshelf/presigned-url', {});
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error).toContain('contentType parameter is required');
    });

    it('returns 400 for unsupported file types', async () => {
      const event = createEvent('POST', '/bookshelf/presigned-url', { contentType: 'application/pdf' });
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid file type');
    });

    it('returns 200 with presigned URL and s3Key for valid image/jpeg', async () => {
      const event = createEvent('POST', '/bookshelf/presigned-url', { contentType: 'image/jpeg' });
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.uploadUrl).toBe('https://s3.amazonaws.com/test-presigned-url');
      expect(body.s3Key).toMatch(/^uploads\/\d+-[a-z0-9]+\.jpg$/);
    });

    it('returns 200 with presigned URL and s3Key for valid image/png', async () => {
      const event = createEvent('POST', '/bookshelf/presigned-url', { contentType: 'image/png' });
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.uploadUrl).toBe('https://s3.amazonaws.com/test-presigned-url');
      expect(body.s3Key).toMatch(/^uploads\/\d+-[a-z0-9]+\.png$/);
    });
  });

  describe('POST /bookshelf/analyze', () => {
    it('returns 400 if s3Key is missing from request body', async () => {
      const event = createEvent('POST', '/bookshelf/analyze', {});
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error).toContain('s3Key parameter is required');
    });

    it('returns isBookshelf false with guardrail message when image is not a bookshelf', async () => {
      jest.spyOn(bedrockService, 'analyzeBookshelfImage').mockResolvedValue({
        is_bookshelf: false,
        guardrail_reason: 'Image is a portrait of a person',
        extracted_books: [],
      });

      const event = createEvent('POST', '/bookshelf/analyze', { s3Key: 'uploads/person.jpg' });
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.isBookshelf).toBe(false);
      expect(body.message).toBe('Image is a portrait of a person');
      expect(body.candidateBooks).toEqual([]);
    });

    it('returns candidate books when image is analyzed as a bookshelf', async () => {
      const mockExtractedBooks = [
        { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', confidence: 0.99 },
      ];
      jest.spyOn(bedrockService, 'analyzeBookshelfImage').mockResolvedValue({
        is_bookshelf: true,
        guardrail_reason: null,
        extracted_books: mockExtractedBooks,
      });

      const mockCandidateBooks = [
        {
          isbn: '9780743273565',
          title: 'The Great Gatsby',
          subtitle: null,
          authors: ['F. Scott Fitzgerald'],
          coverUrl: 'https://books.google.com/cover.jpg',
          publisher: 'Scribner',
          publishDate: '1925',
          pageCount: 180,
          workKey: 'works/123',
        },
      ];
      jest.spyOn(bookSearchService, 'resolveCandidateBooks').mockResolvedValue(mockCandidateBooks);

      const event = createEvent('POST', '/bookshelf/analyze', { s3Key: 'uploads/bookshelf.jpg' });
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.isBookshelf).toBe(true);
      expect(body.candidateBooks).toHaveLength(1);
      expect(body.candidateBooks[0].title).toBe('The Great Gatsby');

      expect(bedrockService.analyzeBookshelfImage).toHaveBeenCalledWith(
        expect.any(String),
        'uploads/bookshelf.jpg'
      );
      expect(bookSearchService.resolveCandidateBooks).toHaveBeenCalledWith(mockExtractedBooks);
    });

    it('returns 500 when bedrock analysis throws an internal error', async () => {
      jest.spyOn(bedrockService, 'analyzeBookshelfImage').mockRejectedValue(new Error('Bedrock API error'));

      const event = createEvent('POST', '/bookshelf/analyze', { s3Key: 'uploads/bookshelf.jpg' });
      const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Bedrock API error');
    });
  });

  it('returns 404 for unknown endpoints', async () => {
    const event = createEvent('POST', '/bookshelf/unknown-action', {});
    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body as string);
    expect(body.error).toBe('Endpoint not found');
  });
});
