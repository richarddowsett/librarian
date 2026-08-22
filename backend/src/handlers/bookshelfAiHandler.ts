import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { analyzeBookshelfImage } from '../services/geminiService';
import { resolveCandidateBooks } from '../services/bookSearchService';


let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const region = process.env.AWS_REGION || 'eu-central-1';
    s3ClientInstance = new S3Client({ region });
  }
  return s3ClientInstance;
}

function jsonResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export async function generatePresignedUploadUrl(
  contentType: string,
  fileName?: string,
  customS3Client?: S3Client
): Promise<{ uploadUrl: string; s3Key: string }> {
  const normalizedType = (contentType || '').toLowerCase().trim();
  if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
    throw new Error('Invalid file type. Supported types: image/jpeg, image/png, image/webp');
  }

  const s3 = customS3Client || getS3Client();
  const bucket = process.env.BOOKSHELF_BUCKET_NAME || process.env.BOOKSHELF_UPLOAD_BUCKET || 'shelfd-bookshelf-uploads';

  let ext = 'jpg';
  if (normalizedType === 'image/png') ext = 'png';
  if (normalizedType === 'image/webp') ext = 'webp';

  const randomId = Math.random().toString(36).substring(2, 10);
  const s3Key = `uploads/${Date.now()}-${randomId}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: normalizedType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

  return { uploadUrl, s3Key };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const rawPath = event.rawPath || event.requestContext.http.path || '';

  if (method === 'OPTIONS') {
    return jsonResponse(200, { success: true });
  }

  if (method !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    let body: any = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (err) {
        return jsonResponse(400, { success: false, error: 'Invalid JSON request body' });
      }
    }

    // Endpoint 1: POST /bookshelf/presigned-url
    if (rawPath.includes('/bookshelf/presigned-url')) {
      const contentType = body.contentType || body.fileType;
      if (!contentType) {
        return jsonResponse(400, {
          success: false,
          error: 'contentType parameter is required (e.g. image/jpeg, image/png, image/webp)',
        });
      }

      try {
        const { uploadUrl, s3Key } = await generatePresignedUploadUrl(contentType, body.fileName);
        return jsonResponse(200, {
          success: true,
          uploadUrl,
          s3Key,
        });
      } catch (err: any) {
        return jsonResponse(400, { success: false, error: err.message });
      }
    }

    // Endpoint 2: POST /bookshelf/analyze
    if (rawPath.includes('/bookshelf/analyze')) {
      const s3Key = body.s3Key;
      if (!s3Key || typeof s3Key !== 'string' || !s3Key.trim()) {
        return jsonResponse(400, {
          success: false,
          error: 's3Key parameter is required',
        });
      }

      const bucket = process.env.BOOKSHELF_BUCKET_NAME || process.env.BOOKSHELF_UPLOAD_BUCKET || 'shelfd-bookshelf-uploads';

      // Call Gemini Vision AI Service
      const geminiResult = await analyzeBookshelfImage(bucket, s3Key.trim());

      if (!geminiResult.is_bookshelf) {
        return jsonResponse(200, {
          success: true,
          isBookshelf: false,
          message: geminiResult.guardrail_reason || 'Image does not appear to contain a bookshelf or books.',
          candidateBooks: [],
          books: [],
        });
      }

      // Resolve candidate books via Google Books / Open Library APIs
      const candidateBooks = await resolveCandidateBooks(geminiResult.extracted_books);

      return jsonResponse(200, {
        success: true,
        isBookshelf: true,
        candidateBooks,
        books: candidateBooks,
      });
    }

    return jsonResponse(404, { success: false, error: 'Endpoint not found' });
  } catch (error: any) {
    console.error('BookshelfAiHandler Error:', error);
    return jsonResponse(500, {
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}
