import { GoogleGenAI } from '@google/genai';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { GeminiAnalysisResult } from '../types';

export interface GeminiServiceOptions {
  apiKey?: string;
  modelId?: string;
  s3Client?: S3Client;
  secretsClient?: SecretsManagerClient;
}

const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

let s3ClientInstance: S3Client | null = null;
let secretsClientInstance: SecretsManagerClient | null = null;
let cachedApiKey: string | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const region = process.env.AWS_REGION || 'eu-central-1';
    s3ClientInstance = new S3Client({ region });
  }
  return s3ClientInstance;
}

function getSecretsClient(): SecretsManagerClient {
  if (!secretsClientInstance) {
    const region = process.env.AWS_REGION || 'eu-central-1';
    secretsClientInstance = new SecretsManagerClient({ region });
  }
  return secretsClientInstance;
}

export function _resetGeminiApiKeyCache(): void {
  cachedApiKey = null;
}

export async function getGeminiApiKey(secretsClient?: SecretsManagerClient): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  if (cachedApiKey) {
    return cachedApiKey;
  }

  const secretName = process.env.GEMINI_SECRET_NAME || 'librarian/gemini-api-key';
  const sm = secretsClient || getSecretsClient();

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await sm.send(command);

    if (response.SecretString) {
      cachedApiKey = response.SecretString.trim();
      return cachedApiKey;
    }
  } catch (err: any) {
    console.warn(`Could not retrieve secret '${secretName}' from Secrets Manager:`, err.message);
  }

  throw new Error(
    `Gemini API key is not configured. Set GEMINI_API_KEY env var or populate secret '${secretName}' in AWS Secrets Manager.`
  );
}

export const BOOKSHELF_ANALYSIS_SYSTEM_PROMPT = `You are an expert AI system for analyzing images of bookshelves, bookcases, and collections of books.

Task:
1. Analyze the image to evaluate if it shows a bookshelf, bookcase, stack of books, or any collection of physical books.
   - If the image is NOT a bookshelf or collection of books (e.g. random object, landscape, human portrait, invalid photo, or inappropriate content), set "is_bookshelf": false, set "guardrail_reason": "<brief explanation>", and "extracted_books": [].
   - If the image IS a bookshelf or collection of books, set "is_bookshelf": true and "guardrail_reason": null.
2. If "is_bookshelf" is true, perform high-accuracy OCR text extraction on all visible book spines and book covers in the photo.
   - Extract the title of each book ("title").
   - Extract the author's name if visible on the spine or cover ("author").
   - Assign a confidence score from 0.0 to 1.0 based on clarity and readability ("confidence").
   - Include a location hint (e.g. "top shelf, left", "middle shelf, 3rd from left") if discernible ("spine_location_hint").
3. Output MUST strictly be valid raw JSON matching the JSON schema below, without any markdown formatting wrappers (no \`\`\`json), explanations, or preamble.

JSON Schema:
{
  "is_bookshelf": boolean,
  "guardrail_reason": string | null,
  "extracted_books": Array<{
    "title": string,
    "author"?: string,
    "confidence": number,
    "spine_location_hint"?: string
  }>
}`;

/**
 * Downloads a bookshelf image from S3 and invokes Google Gemini 2.5 Flash
 * to analyze whether it's a bookshelf and perform OCR to extract book titles & authors.
 */
export async function analyzeBookshelfImage(
  s3Bucket: string,
  s3Key: string,
  options?: GeminiServiceOptions
): Promise<GeminiAnalysisResult> {
  const s3 = options?.s3Client || getS3Client();
  const modelId = options?.modelId || process.env.GEMINI_MODEL_ID || DEFAULT_MODEL_ID;

  const apiKey = options?.apiKey || (await getGeminiApiKey(options?.secretsClient));

  // 1. Download image from S3
  const getObjCmd = new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key });
  const s3Response = await s3.send(getObjCmd);

  if (!s3Response.Body) {
    throw new Error(`S3 object '${s3Key}' in bucket '${s3Bucket}' has no content body`);
  }

  const byteArray = await s3Response.Body.transformToByteArray();
  const base64Image = Buffer.from(byteArray).toString('base64');

  let mimeType = s3Response.ContentType || 'image/jpeg';
  if (mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
    if (s3Key.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (s3Key.toLowerCase().endsWith('.webp')) {
      mimeType = 'image/webp';
    } else {
      mimeType = 'image/jpeg';
    }
  }

  // 2. Invoke Google Gemini Vision Model
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          {
            text: 'Analyze this photo of a bookshelf or book collection, perform OCR text extraction, and return the structured JSON result according to system instructions.',
          },
        ],
      },
    ],
    config: {
      systemInstruction: BOOKSHELF_ANALYSIS_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('Gemini model returned an empty response');
  }

  // 3. Clean and parse structured output JSON
  let cleanedText = responseText.trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  try {
    const rawResult = JSON.parse(cleanedText);
    const isBookshelf = Boolean(rawResult.is_bookshelf);
    const guardrailReason = rawResult.guardrail_reason ? String(rawResult.guardrail_reason) : null;

    let extractedBooks = [];
    if (isBookshelf && Array.isArray(rawResult.extracted_books)) {
      extractedBooks = rawResult.extracted_books
        .map((item: any) => ({
          title: String(item.title || '').trim(),
          author: item.author ? String(item.author).trim() : undefined,
          confidence: typeof item.confidence === 'number' ? item.confidence : 1.0,
          spine_location_hint: item.spine_location_hint ? String(item.spine_location_hint).trim() : undefined,
        }))
        .filter((b: any) => b.title.length > 0);
    }

    return {
      is_bookshelf: isBookshelf,
      guardrail_reason: guardrailReason,
      extracted_books: extractedBooks,
    };
  } catch (err: any) {
    throw new Error(`Failed to parse structured JSON from Gemini model output: ${err.message}`);
  }
}
