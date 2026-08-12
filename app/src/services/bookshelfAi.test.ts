import {
  getPresignedUploadUrl,
  uploadImageToS3,
  analyzeBookshelfImage,
} from './bookshelfAi';

describe('bookshelfAi service', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('getPresignedUploadUrl', () => {
    it('returns presigned URL and S3 key from API when successful', async () => {
      const mockResponse = {
        uploadUrl: 'https://s3.amazonaws.com/upload-path',
        s3Key: 'bookshelf-uploads/photo123.jpg',
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await getPresignedUploadUrl('photo123.jpg', 'image/jpeg');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bookshelf/presigned-url'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ fileName: 'photo123.jpg', fileType: 'image/jpeg' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('falls back to mock response when API endpoint fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await getPresignedUploadUrl('photo123.jpg', 'image/jpeg');

      expect(result.uploadUrl).toContain('mock-s3-presigned-url.local');
      expect(result.s3Key).toContain('bookshelf-uploads/dev-');
    });
  });

  describe('uploadImageToS3', () => {
    it('handles mock presigned URLs seamlessly without fetch', async () => {
      const result = await uploadImageToS3(
        'https://mock-s3-presigned-url.local/test-key',
        'data:image/jpeg;base64,1234'
      );

      expect(result).toBe(true);
    });

    it('uploads blob payload to real S3 upload URL via HTTP PUT', async () => {
      const mockBlob = new Blob(['dummy image bytes'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url === 'data:image/jpeg;base64,1234') {
          return Promise.resolve({
            blob: async () => mockBlob,
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      });

      const result = await uploadImageToS3(
        'https://s3.amazonaws.com/real-upload-path',
        'data:image/jpeg;base64,1234',
        'image/jpeg'
      );

      expect(result).toBe(true);
    });
  });

  describe('analyzeBookshelfImage', () => {
    it('returns guardrail response when s3Key indicates non-bookshelf image', async () => {
      const result = await analyzeBookshelfImage('bookshelf-uploads/not-bookshelf.jpg');

      expect(result.isBookshelf).toBe(false);
      expect(result.books).toHaveLength(0);
      expect(result.message).toContain('No bookshelf detected');
    });

    it('returns API response when analyze endpoint succeeds', async () => {
      const apiResult = {
        isBookshelf: true,
        books: [
          {
            title: 'Dune',
            authors: ['Frank Herbert'],
            isbn: '9780441172719',
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => apiResult,
      } as Response);

      const result = await analyzeBookshelfImage('bookshelf-uploads/real-shelf.jpg');

      expect(result.isBookshelf).toBe(true);
      expect(result.books).toHaveLength(1);
      expect(result.books[0].title).toBe('Dune');
    });

    it('propagates error when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Backend offline'));

      await expect(analyzeBookshelfImage('bookshelf-uploads/dev-sample.jpg')).rejects.toThrow(
        'Backend offline'
      );
    });
  });
});
