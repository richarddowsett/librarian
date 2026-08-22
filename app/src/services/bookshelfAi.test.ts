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
    it('returns presigned URL and Storage key from API when successful', async () => {
      const mockResponse = {
        uploadUrl: 'https://storage.googleapis.com/upload-path',
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

      expect(result.uploadUrl).toBe('https://storage.googleapis.com/upload-path');
      expect(result.s3Key).toBe('bookshelf-uploads/photo123.jpg');
    });
  });

  describe('uploadImageToS3', () => {
    it('uploads file payload to presigned URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: jest.fn().mockResolvedValue(new Blob(['data'], { type: 'image/jpeg' })),
      } as any);

      const targetUrl = 'https://storage.googleapis.com/real-upload-path';
      const result = await uploadImageToS3(targetUrl, 'file:///path/photo.jpg', 'image/jpeg');

      expect(result).toBe(true);
    });
  });

  describe('analyzeBookshelfImage', () => {
    it('returns API response when analyze endpoint succeeds', async () => {
      const mockResult = {
        isBookshelf: true,
        books: [{ title: 'Dune', authors: ['Frank Herbert'] }],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      } as Response);

      const result = await analyzeBookshelfImage('bookshelf-uploads/photo123.jpg');

      expect(result.isBookshelf).toBe(true);
      expect(result.books.length).toBe(1);
      expect(result.books[0].title).toBe('Dune');
    });
  });
});
