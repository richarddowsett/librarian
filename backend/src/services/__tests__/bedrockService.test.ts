import { analyzeBookshelfImage, BOOKSHELF_ANALYSIS_SYSTEM_PROMPT } from '../bedrockService';

describe('Bedrock AI Service', () => {
  const sampleBucket = 'librarian-bookshelf-uploads';
  const sampleKey = 'uploads/test-bookshelf.jpg';

  const createMockS3Client = (bodyBytes: Uint8Array = new Uint8Array([1, 2, 3, 4]), contentType = 'image/jpeg') => {
    return {
      send: jest.fn().mockResolvedValue({
        Body: {
          transformToByteArray: async () => bodyBytes,
        },
        ContentType: contentType,
      }),
    } as any;
  };

  const createMockBedrockClient = (responseJson: any) => {
    const encodedResponse = new TextEncoder().encode(
      JSON.stringify({
        content: [
          {
            type: 'text',
            text: typeof responseJson === 'string' ? responseJson : JSON.stringify(responseJson),
          },
        ],
      })
    );

    return {
      send: jest.fn().mockResolvedValue({
        body: encodedResponse,
      }),
    } as any;
  };

  beforeEach(() => {
    delete process.env.BEDROCK_GUARDRAIL_ID;
    delete process.env.BEDROCK_GUARDRAIL_VERSION;
    delete process.env.BEDROCK_MODEL_ID;
  });

  it('successfully extracts books from a valid bookshelf image', async () => {
    const mockS3 = createMockS3Client();
    const mockBedrockResult = {
      is_bookshelf: true,
      guardrail_reason: null,
      extracted_books: [
        {
          title: 'Dune',
          author: 'Frank Herbert',
          confidence: 0.98,
          spine_location_hint: 'Shelf 1, Book 3',
        },
        {
          title: 'Foundation',
          author: 'Isaac Asimov',
          confidence: 0.95,
        },
      ],
    };
    const mockBedrock = createMockBedrockClient(mockBedrockResult);

    const result = await analyzeBookshelfImage(sampleBucket, sampleKey, {
      s3Client: mockS3,
      bedrockClient: mockBedrock,
    });

    expect(result.is_bookshelf).toBe(true);
    expect(result.guardrail_reason).toBeNull();
    expect(result.extracted_books).toHaveLength(2);
    expect(result.extracted_books[0]).toEqual({
      title: 'Dune',
      author: 'Frank Herbert',
      confidence: 0.98,
      spine_location_hint: 'Shelf 1, Book 3',
    });

    expect(mockS3.send).toHaveBeenCalledTimes(1);
    expect(mockBedrock.send).toHaveBeenCalledTimes(1);

    const bedrockCallArg = mockBedrock.send.mock.calls[0][0];
    const payload = JSON.parse(bedrockCallArg.input.body);
    expect(payload.system).toBe(BOOKSHELF_ANALYSIS_SYSTEM_PROMPT);
    expect(payload.messages[0].content[0].source.media_type).toBe('image/jpeg');
  });

  it('returns is_bookshelf false with guardrail_reason when image is not a bookshelf', async () => {
    const mockS3 = createMockS3Client();
    const mockBedrockResult = {
      is_bookshelf: false,
      guardrail_reason: 'Image contains a sleeping cat, not a bookshelf.',
      extracted_books: [],
    };
    const mockBedrock = createMockBedrockClient(mockBedrockResult);

    const result = await analyzeBookshelfImage(sampleBucket, sampleKey, {
      s3Client: mockS3,
      bedrockClient: mockBedrock,
    });

    expect(result.is_bookshelf).toBe(false);
    expect(result.guardrail_reason).toBe('Image contains a sleeping cat, not a bookshelf.');
    expect(result.extracted_books).toEqual([]);
  });

  it('includes Bedrock Guardrail parameters when BEDROCK_GUARDRAIL_ID is configured', async () => {
    process.env.BEDROCK_GUARDRAIL_ID = 'gr-123456';
    process.env.BEDROCK_GUARDRAIL_VERSION = '1';

    const mockS3 = createMockS3Client();
    const mockBedrock = createMockBedrockClient({
      is_bookshelf: true,
      guardrail_reason: null,
      extracted_books: [],
    });

    await analyzeBookshelfImage(sampleBucket, sampleKey, {
      s3Client: mockS3,
      bedrockClient: mockBedrock,
    });

    const bedrockCallArg = mockBedrock.send.mock.calls[0][0];
    expect(bedrockCallArg.input.guardrailIdentifier).toBe('gr-123456');
    expect(bedrockCallArg.input.guardrailVersion).toBe('1');
  });

  it('handles markdown json codeblocks in LLM output', async () => {
    const mockS3 = createMockS3Client();
    const rawMarkdownText = `\`\`\`json
{
  "is_bookshelf": true,
  "guardrail_reason": null,
  "extracted_books": [
    { "title": "1984", "author": "George Orwell", "confidence": 0.99 }
  ]
}
\`\`\``;
    const mockBedrock = createMockBedrockClient(rawMarkdownText);

    const result = await analyzeBookshelfImage(sampleBucket, sampleKey, {
      s3Client: mockS3,
      bedrockClient: mockBedrock,
    });

    expect(result.is_bookshelf).toBe(true);
    expect(result.extracted_books[0].title).toBe('1984');
  });

  it('throws an error if S3 object body is missing', async () => {
    const mockS3 = {
      send: jest.fn().mockResolvedValue({ Body: null }),
    } as any;
    const mockBedrock = createMockBedrockClient({});

    await expect(
      analyzeBookshelfImage(sampleBucket, sampleKey, {
        s3Client: mockS3,
        bedrockClient: mockBedrock,
      })
    ).rejects.toThrow("S3 object 'uploads/test-bookshelf.jpg' in bucket 'librarian-bookshelf-uploads' has no content body");
  });

  it('throws an error if Bedrock output is not valid JSON', async () => {
    const mockS3 = createMockS3Client();
    const mockBedrock = createMockBedrockClient('INVALID_NON_JSON_RESPONSE');

    await expect(
      analyzeBookshelfImage(sampleBucket, sampleKey, {
        s3Client: mockS3,
        bedrockClient: mockBedrock,
      })
    ).rejects.toThrow('Failed to parse structured JSON from Bedrock model output');
  });
});
