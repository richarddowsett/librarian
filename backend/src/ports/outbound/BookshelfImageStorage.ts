export interface BookshelfImageStorage {
  generateSignedUploadUrl(
    userId: string,
    fileExtension?: string,
    contentType?: string
  ): Promise<{ uploadUrl: string; objectPath: string; fileName: string }>;

  downloadImageAsBase64(objectPath: string): Promise<{ base64Data: string; mimeType: string }>;
}
