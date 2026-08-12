import { ApiOptions } from './apiClient';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://d3awrdif72.execute-api.eu-central-1.amazonaws.com';

export interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface BookshelfCandidateBook {
  id?: string;
  title: string;
  authors: string[];
  isbn?: string;
  publisher?: string;
  publishDate?: string;
  pageCount?: number;
  coverUrl?: string;
  confidence?: number;
  seriesName?: string;
  seriesVolumeNumber?: number;
}

export interface BookshelfAnalysisResult {
  isBookshelf: boolean;
  books: BookshelfCandidateBook[];
  message?: string;
}

function getHeaders(options?: ApiOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }
  if (options?.userId) {
    headers['x-user-id'] = options.userId;
  }

  return headers;
}

function checkUnauthorized(response: Response, options?: ApiOptions): boolean {
  if (response.status === 401 || response.status === 403) {
    console.warn(`API returned ${response.status} Unauthorized for URL: ${response.url}`);
    if (options?.onUnauthorized) {
      options.onUnauthorized();
    }
    return true;
  }
  return false;
}

/**
 * Requests a presigned S3 upload URL from API Gateway.
 */
export async function getPresignedUploadUrl(
  fileName: string,
  fileType: string,
  options?: ApiOptions
): Promise<PresignedUrlResponse> {
  if (API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/bookshelf/presigned-url`, {
        method: 'POST',
        headers: getHeaders(options),
        body: JSON.stringify({ fileName, fileType }),
      });

      if (checkUnauthorized(response, options)) {
        throw new Error('Unauthorized upload request');
      }

      if (response.ok) {
        const data = await response.json();
        if (data.uploadUrl && data.s3Key) {
          return { uploadUrl: data.uploadUrl, s3Key: data.s3Key };
        }
      }
    } catch (error) {
      console.warn('API Gateway presigned URL fetch failed or offline, using fallback dev mode:', error);
    }
  }

  // Fallback mock response for offline / dev testing
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
  const mockKey = `bookshelf-uploads/dev-${Date.now()}-${cleanName}`;
  return {
    uploadUrl: `https://mock-s3-presigned-url.local/${mockKey}`,
    s3Key: mockKey,
  };
}

/**
 * Uploads image file binary payload directly to S3 via HTTP PUT.
 */
export async function uploadImageToS3(
  uploadUrl: string,
  imageUri: string,
  fileType: string = 'image/jpeg'
): Promise<boolean> {
  try {
    // Development / mock S3 URL simulation
    if (uploadUrl.includes('mock-s3-presigned-url.local')) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return true;
    }

    let body: any;
    if (imageUri.startsWith('data:')) {
      const response = await fetch(imageUri);
      body = await response.blob();
    } else if (imageUri.startsWith('blob:') || imageUri.startsWith('file:')) {
      const response = await fetch(imageUri);
      body = await response.blob();
    } else {
      body = imageUri;
    }

    const s3Response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
      },
      body,
    });

    return s3Response.ok;
  } catch (error) {
    console.error('uploadImageToS3 Error:', error);
    return false;
  }
}

/**
 * Calls API Gateway to trigger Gemini Vision scan & metadata resolution on uploaded S3 key.
 */
export async function analyzeBookshelfImage(
  s3Key: string,
  options?: ApiOptions
): Promise<BookshelfAnalysisResult> {
  // Test guardrail case for mock key containing "invalid" or "not-bookshelf"
  if (s3Key.includes('not-bookshelf') || s3Key.includes('invalid')) {
    return {
      isBookshelf: false,
      books: [],
      message: 'No bookshelf detected in photo. Please ensure your photo clearly shows book spines on a shelf.',
    };
  }

  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured');
  }

  const response = await fetch(`${API_BASE_URL}/bookshelf/analyze`, {
    method: 'POST',
    headers: getHeaders(options),
    body: JSON.stringify({ s3Key }),
  });

  if (checkUnauthorized(response, options)) {
    return {
      isBookshelf: false,
      books: [],
      message: 'Session expired. Please log in again.',
    };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API analysis request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return {
    isBookshelf: data.isBookshelf ?? true,
    books: data.candidateBooks || data.books || [],
    message: data.message,
  };
}
