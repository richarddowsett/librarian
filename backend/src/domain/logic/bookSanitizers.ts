export function sanitizeIsbn(isbn: string): string {
  if (!isbn) return '';
  return isbn.replace(/[-\s]/g, '').trim().toUpperCase();
}

export function isValidIsbnFormat(isbn: string): boolean {
  const sanitized = sanitizeIsbn(isbn);
  return /^(?:\d{9}[\dX]|\d{13})$/.test(sanitized);
}

export function isEnglishBookMetadata(volumeInfo: any): boolean {
  if (!volumeInfo) return false;
  const lang = (volumeInfo.language || '').trim().toLowerCase();
  if (lang && !lang.startsWith('en')) {
    return false;
  }
  const title = volumeInfo.title || '';
  if (/[\u0400-\u04FF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u0370-\u03FF]/.test(title)) {
    return false;
  }
  return true;
}
