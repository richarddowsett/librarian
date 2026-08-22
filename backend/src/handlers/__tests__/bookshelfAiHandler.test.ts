import { handler } from '../bookshelfAiHandler';
import * as geminiService from '../../services/geminiService';
import * as bookSearchService from '../../services/bookSearchService';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: () => ({
        file: () => ({
          getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/test-signed-url']),
        }),
      }),
    })),
  };
});

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
  });

  it('generates presigned upload URL for valid content-type', async () => {
    const event = createEvent('POST', '/bookshelf/presigned-url', {
      contentType: 'image/jpeg',
    });
    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.uploadUrl).toBeDefined();
    expect(body.s3Key).toMatch(/^uploads\/\d+-[a-z0-9]+\.jpg$/);
  });

  it('analyzes image and returns resolved candidate books when valid bookshelf image is uploaded', async () => {
    const mockGeminiResult = {
      is_bookshelf: true,
      guardrail_reason: null,
      extracted_books: [
        { title: 'Dune', author: 'Frank Herbert', confidence: 0.95 },
      ],
    };

    const mockResolvedBooks = [
      {
        isbn: '9780441172719',
        title: 'Dune',
        authors: ['Frank Herbert'],
        coverUrl: 'https://covers.com/dune.jpg',
        publisher: 'Ace',
        publishDate: '1965',
        pageCount: 412,
        workKey: 'OL82563W',
      },
    ];

    jest.spyOn(geminiService, 'analyzeBookshelfImage').mockResolvedValue(mockGeminiResult);
    jest.spyOn(bookSearchService, 'resolveCandidateBooks').mockResolvedValue(mockResolvedBooks as any);

    const event = createEvent('POST', '/bookshelf/analyze', {
      s3Key: 'uploads/123456-test.jpg',
    });

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.isBookshelf).toBe(true);
    expect(body.candidateBooks.length).toBe(1);
    expect(body.candidateBooks[0].title).toBe('Dune');
  });
});
