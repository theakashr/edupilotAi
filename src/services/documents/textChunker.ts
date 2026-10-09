/**
 * src/services/documents/textChunker.ts
 *
 * Deterministic text chunker for educational materials.
 * Preserves page numbers, paragraph/section boundaries, and produces deterministic IDs.
 * Highly suited for subsequent vector embeddings and RAG grounding in EduPilot AI.
 */

import type { ExtractedPage } from './pdfExtractor';
import { cleanExtractedText, detectHeading } from './textCleaner';
import { DEFAULT_DOCUMENT_CONFIG, DocumentProcessorConfig } from './config';

export interface GeneratedChunk {
  id: string;
  materialId: string;
  courseId: string;
  chunkIndex: number;
  text: string;
  pageNumber: number;
  sectionTitle?: string;
}

export interface ChunkingOptions {
  config?: Partial<DocumentProcessorConfig>;
}

/**
 * Splits text into natural semantic fragments (paragraphs, code blocks, or sentences).
 */
function splitIntoNaturalFragments(text: string): string[] {
  // First attempt splitting by double-newlines (paragraphs / code blocks)
  const paragraphs = text.split(/\n\n+/);
  const fragments: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    fragments.push(trimmed);
  }

  return fragments;
}

/**
 * Deterministically chunks cleaned pages into retrieval-ready segments.
 *
 * @param pages - Extracted and cleaned pages with 1-indexed pageNumber
 * @param materialId - ID of the parent material
 * @param courseId - ID of the associated course
 * @param options - Configurable chunk size and overlap
 * @returns Array of GeneratedChunk objects with deterministic IDs and page metadata
 */
export function chunkExtractedPages(
  pages: ExtractedPage[],
  materialId: string,
  courseId: string,
  options?: ChunkingOptions
): GeneratedChunk[] {
  const chunkSize = options?.config?.chunkSize ?? DEFAULT_DOCUMENT_CONFIG.chunkSize;
  const chunkOverlap = options?.config?.chunkOverlap ?? DEFAULT_DOCUMENT_CONFIG.chunkOverlap;
  const maxChunks = options?.config?.maxChunksPerMaterial ?? DEFAULT_DOCUMENT_CONFIG.maxChunksPerMaterial;

  const chunks: GeneratedChunk[] = [];
  let chunkIndex = 0;
  let currentSectionTitle: string | undefined = undefined;

  for (const page of pages) {
    const cleanedPageText = cleanExtractedText(page.text);
    if (!cleanedPageText) continue;

    const fragments = splitIntoNaturalFragments(cleanedPageText);
    let currentChunkBuffer = '';

    for (const fragment of fragments) {
      // Check for section headings
      const heading = detectHeading(fragment);
      if (heading) {
        currentSectionTitle = heading;
      }

      // If adding this fragment exceeds chunk size and buffer is not empty
      if (currentChunkBuffer.length + fragment.length + 2 > chunkSize && currentChunkBuffer.length > 0) {
        // Emit current chunk
        chunks.push({
          id: `${materialId}_chk_${chunkIndex}`,
          materialId,
          courseId,
          chunkIndex,
          text: currentChunkBuffer.trim(),
          pageNumber: page.pageNumber,
          sectionTitle: currentSectionTitle,
        });

        chunkIndex++;
        if (chunkIndex >= maxChunks) break;

        // Apply overlap from end of current buffer
        if (chunkOverlap > 0 && currentChunkBuffer.length > chunkOverlap) {
          const overlapText = currentChunkBuffer.slice(-chunkOverlap).trim();
          currentChunkBuffer = overlapText + '\n\n' + fragment;
        } else {
          currentChunkBuffer = fragment;
        }
      } else {
        // Append fragment to current buffer
        if (currentChunkBuffer.length > 0) {
          currentChunkBuffer += '\n\n' + fragment;
        } else {
          currentChunkBuffer = fragment;
        }
      }

      // If a single fragment is larger than chunkSize (e.g. very long continuous text/code)
      while (currentChunkBuffer.length > chunkSize) {
        // Find safe break point near chunkSize
        let breakIndex = currentChunkBuffer.lastIndexOf('\n', chunkSize);
        if (breakIndex === -1 || breakIndex < chunkSize * 0.5) {
          breakIndex = currentChunkBuffer.lastIndexOf(' ', chunkSize);
        }
        if (breakIndex === -1) {
          breakIndex = chunkSize;
        }

        const chunkText = currentChunkBuffer.slice(0, breakIndex).trim();
        if (chunkText.length > 0) {
          chunks.push({
            id: `${materialId}_chk_${chunkIndex}`,
            materialId,
            courseId,
            chunkIndex,
            text: chunkText,
            pageNumber: page.pageNumber,
            sectionTitle: currentSectionTitle,
          });

          chunkIndex++;
          if (chunkIndex >= maxChunks) break;
        }

        // Advance buffer with overlap
        const sliceStart = Math.max(0, breakIndex - chunkOverlap);
        currentChunkBuffer = currentChunkBuffer.slice(sliceStart).trim();
      }

      if (chunkIndex >= maxChunks) break;
    }

    // Flush any remaining buffer for this page
    if (currentChunkBuffer.trim().length > 0 && chunkIndex < maxChunks) {
      chunks.push({
        id: `${materialId}_chk_${chunkIndex}`,
        materialId,
        courseId,
        chunkIndex,
        text: currentChunkBuffer.trim(),
        pageNumber: page.pageNumber,
        sectionTitle: currentSectionTitle,
      });

      chunkIndex++;
    }

    if (chunkIndex >= maxChunks) break;
  }

  return chunks;
}
