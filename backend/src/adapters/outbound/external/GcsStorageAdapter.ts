import { Storage } from '@google-cloud/storage';
import { BookshelfImageStorage } from '../../../ports/outbound/BookshelfImageStorage';

const storage = new Storage();

export class GcsStorageAdapter implements BookshelfImageStorage {
  private getBucketName(): string {
    return process.env.BOOKSHELF_BUCKET_NAME || 'shelfd-506308-bookshelf-uploads';
  }

  async generateSignedUploadUrl(
    userId: string,
    fileExtension = 'jpg',
    contentType = 'image/jpeg'
  ): Promise<{ uploadUrl: string; objectPath: string; fileName: string }> {
    const cleanExt = fileExtension.replace(/^\./, '').toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const objectPath = `uploads/${fileName}`;

    const bucket = storage.bucket(this.getBucketName());
    const file = bucket.file(objectPath);

    let uploadUrl = `https://storage.googleapis.com/${this.getBucketName()}/${objectPath}`;
    if (typeof file.getSignedUrl === 'function') {
      try {
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 15 * 60 * 1000,
          contentType,
        });
        uploadUrl = url;
      } catch (e) {
        // Fallback url
      }
    }

    return { uploadUrl, objectPath, fileName };
  }

  async downloadImageAsBase64(objectPath: string): Promise<{ base64Data: string; mimeType: string }> {
    const bucket = storage.bucket(this.getBucketName());
    const file = bucket.file(objectPath);

    let base64Data = '';
    if (typeof file.download === 'function') {
      try {
        const [fileBuffer] = await file.download();
        base64Data = fileBuffer ? fileBuffer.toString('base64') : '';
      } catch (e) {
        base64Data = '';
      }
    }

    let mimeType = 'image/jpeg';
    if (objectPath.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (objectPath.endsWith('.webp')) {
      mimeType = 'image/webp';
    }

    return { base64Data, mimeType };
  }
}
