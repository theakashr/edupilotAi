import type { MaterialType } from '@/types';

/**
 * Single source of truth for the Supabase private storage bucket.
 */
export const STORAGE_BUCKET = 'edupilot-materials';

/**
 * Maximum permitted educational file upload size (50 MB).
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Allowed file extensions and corresponding MIME types.
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt'] as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

/**
 * Sanitizes a raw file name by removing illegal path characters,
 * spaces, and dangerous path traversal tokens.
 */
export function sanitizeFileName(rawName: string): string {
  // Strip path traversal attempts and special characters
  const cleanName = rawName
    .replace(/[/\\]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  return cleanName || 'unnamed_document';
}

/**
 * Generates a unique material identifier.
 */
export function generateMaterialId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `mat_${Date.now()}`;
}

/**
 * Generates the standardized storage path:
 * courses/{courseId}/materials/{materialId}/{sanitizedFileName}
 */
export function generateStoragePath(
  courseId: string,
  materialId: string,
  fileName: string
): string {
  const safeName = sanitizeFileName(fileName);
  return `courses/${courseId}/materials/${materialId}/${safeName}`;
}

/**
 * Determines the high-level MaterialType enum from extension/MIME.
 */
export function determineMaterialType(fileName: string, mimeType: string): MaterialType {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (
    lowerName.endsWith('.ppt') ||
    lowerName.endsWith('.pptx') ||
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint')
  ) {
    return 'ppt';
  }
  if (
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx') ||
    mimeType.includes('word') ||
    mimeType.includes('document')
  ) {
    return 'document';
  }
  if (lowerName.endsWith('.txt') || mimeType === 'text/plain') {
    return 'note';
  }

  return 'other';
}

/**
 * Validates file criteria (size, format, extension).
 */
export function validateEducationalFile(file: {
  name: string;
  size: number;
  type?: string;
}): { valid: boolean; error?: string } {
  if (!file.name) {
    return { valid: false, error: 'A valid file must be selected.' };
  }

  // 1. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMb} MB). Maximum permitted size is 50 MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Selected file is empty (0 bytes).' };
  }

  // 2. Check extension
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    };
  }

  return { valid: true };
}
