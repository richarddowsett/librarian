import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { BedrockAnalysisResult } from '../types';

export interface BedrockServiceOptions {
  bedrockClient?: BedrockRuntimeClient;
  s3Client?: S3Client;
  modelId?: string;
  guardrailId?: string;
  guardrailVersion?: string;
}

const DEFAULT_MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

let s3ClientInstance: S3Client | null = null;
let bedrockClientInstance: BedrockRuntimeClient | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const region = process.env.AWS_REGION || 'eu-central-1';
    s3ClientInstance = new S3Client({ region });
  }
  return s3ClientInstance;
}

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClientInstance) {
    const region = process.env.AWS_REGION || 'eu-central-1';
    bedrockClientInstance = new BedrockRuntimeClient({ region });
  }
  return bedrockClientInstance;
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
 * Downloads a bookshelf image from S3 and invokes Anthropic Claude 3.5 Sonnet on Amazon Bedrock
 * to analyze whether it's a bookshelf and perform OCR to extract book titles & authors.
 */
export async function analyzeBookshelfImage(
  s3Bucket: string,
  s3Key: string,
  options?: BedrockServiceOptions
): Promise<BedrockAnalysisResult> {
  const s3 = options?.s3Client || getS3Client();
  const bedrock = options?.bedrockClient || getBedrockClient();
  const modelId = options?.modelId || process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;
  const guardrailId = options?.guardrailId || process.env.BEDROCK_GUARDRAIL_ID;
  const guardrailVersion = options?.guardrailVersion || process.env.BEDROCK_GUARDRAIL_VERSION || 'DRAFT';

  // 1. Download image from S3
  const getObjCmd = new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key });
  const s3Response = await s3.send(getObjCmd);

  if (!s3Response.Body) {
    throw new Error(`S3 object '${s3Key}' in bucket '${s3Bucket}' has no content body`);
  }

  const byteArray = await s3Response.Body.transformToByteArray();
  const base64Image = Buffer.from(byteArray).toString('base64');

  let mediaType = s3Response.ContentType || 'image/jpeg';
  if (mediaType === 'application/octet-stream' || !mediaType.startsWith('image/')) {
    if (s3Key.toLowerCase().endsWith('.png')) {
      mediaType = 'image/png';
    } else if (s3Key.toLowerCase().endsWith('.webp')) {
      mediaType = 'image/webp';
    } else {
      mediaType = 'image/jpeg';
    }
  }

  // 2. Prepare Bedrock Request Payload for Anthropic Claude 3.5 Sonnet
  const bedrockPayload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: BOOKSHELF_ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'Analyze this photo of a bookshelf or book collection, perform OCR text extraction, and return the structured JSON result.',
          },
        ],
      },
    ],
  };

  const commandInput: InvokeModelCommandInput = {
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(bedrockPayload),
  };

  if (guardrailId) {
    commandInput.guardrailIdentifier = guardrailId;
    commandInput.guardrailVersion = guardrailVersion;
  }

  // 3. Invoke Bedrock
  const bedrockResponse = await bedrock.send(new InvokeModelCommand(commandInput));

  if (!bedrockResponse.body) {
    throw new Error('Bedrock returned an empty response body');
  }

  const responseText = new TextDecoder('utf-8').decode(bedrockResponse.body);
  const parsedResponseBody = JSON.parse(responseText);

  // Anthropic Claude response structure has array of content blocks in `content`
  const textContent = parsedResponseBody?.content?.[0]?.text;
  if (!textContent) {
    throw new Error('Bedrock response did not contain text content');
  }

  // 4. Clean and parse LLM response JSON
  let cleanedText = textContent.trim();
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
    throw new Error(`Failed to parse structured JSON from Bedrock model output: ${err.message}`);
  }
}
