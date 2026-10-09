import type { Timestamp } from 'firebase/firestore';

export type MaterialType = 'pdf' | 'ppt' | 'document' | 'note' | 'other';
export type MaterialStatus =
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'archived';

export interface Material {
  id: string;
  courseId: string;
  uploadedBy: string;
  title: string;
  description?: string;
  type: MaterialType;
  /** Path in Firebase Storage — NOT a URL, NOT the binary content */
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: MaterialStatus;
  version: number;
  /** Storage provider holding the file binary */
  storageProvider?: 'supabase';
  /** Number of pages extracted from the PDF document */
  pageCount?: number;
  /** Number of text chunks generated for RAG */
  chunkCount?: number;
  /** Safe error description if processing fails */
  processingError?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Represents a text chunk extracted from a material.
 * Future RAG pipeline: Material → Extract → Chunk → Embed → Vector Search → Agnes
 */
export interface MaterialChunk {
  id: string;
  materialId: string;
  courseId: string;
  chunkIndex: number;
  text: string;
  pageNumber?: number;
  sectionTitle?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
