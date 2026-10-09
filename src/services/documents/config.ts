/**
 * src/services/documents/config.ts
 *
 * Central configuration for document processing, PDF extraction, and text chunking.
 * Configurable thresholds and chunk parameters — no hardcoded numbers across the pipeline.
 */

export interface DocumentProcessorConfig {
  /** Target maximum character length per chunk (approximately 250-350 tokens) */
  chunkSize: number;
  /** Number of overlapping characters between consecutive chunks to maintain semantic context */
  chunkOverlap: number;
  /** Maximum allowable document size in bytes (50 MB default) */
  maxFileSizeBytes: number;
  /** Minimum extracted characters required across the document to consider it text-based */
  minExtractableTextChars: number;
  /** Maximum number of chunks to generate from a single material (safety circuit breaker) */
  maxChunksPerMaterial: number;
}

export const DEFAULT_DOCUMENT_CONFIG: DocumentProcessorConfig = {
  chunkSize: 1200,
  chunkOverlap: 180,
  maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
  minExtractableTextChars: 25,
  maxChunksPerMaterial: 1000,
};
