/**
 * src/services/ai/context/sourceFormatter.ts
 *
 * Formats educational material chunks and concept metadata into structured,
 * inspectable context blocks with rigorous provenance tracking.
 */

import type { MaterialChunk, Concept } from '@/types';

export interface FormattedChunkMetadata {
  materialId: string;
  chunkId: string;
  pageNumber?: number;
  sectionTitle?: string;
  conceptName?: string;
  charCount: number;
}

/**
 * Formats a single material chunk into a clear, bounded source block.
 */
export function formatSingleChunk(
  chunk: MaterialChunk,
  materialTitleMap?: Record<string, string>,
  conceptName?: string
): { formattedText: string; metadata: FormattedChunkMetadata } {
  const title = materialTitleMap?.[chunk.materialId] || `Material ${chunk.materialId}`;
  const pageStr = chunk.pageNumber !== undefined ? String(chunk.pageNumber) : 'Unknown';
  const sectionStr = chunk.sectionTitle || 'General Section';
  const conceptStr = conceptName || 'General Curriculum';

  const header = [
    `=== SOURCE DOCUMENT CHUNK ===`,
    `Material ID: ${chunk.materialId}`,
    `Material Title: ${title}`,
    `Chunk ID: ${chunk.id}`,
    `Page Number: ${pageStr}`,
    `Section: ${sectionStr}`,
    `Associated Concept: ${conceptStr}`,
    `--- CONTENT START ---`,
  ].join('\n');

  const footer = `\n--- CONTENT END ---\n`;
  const formattedText = `${header}\n${chunk.text.trim()}${footer}`;

  return {
    formattedText,
    metadata: {
      materialId: chunk.materialId,
      chunkId: chunk.id,
      pageNumber: chunk.pageNumber,
      sectionTitle: chunk.sectionTitle,
      conceptName,
      charCount: formattedText.length,
    },
  };
}

/**
 * Formats concepts into an authoritative concept reference block.
 */
export function formatConceptsSummary(concepts: Concept[]): string {
  if (concepts.length === 0) {
    return '';
  }

  const lines = [
    `=== AUTHORITATIVE COURSE CONCEPTS ===`,
    ...concepts.map((c, i) => {
      const desc = c.description ? ` - ${c.description}` : '';
      const diff = c.difficulty ? ` [Difficulty: ${c.difficulty}/10]` : '';
      return `${i + 1}. Concept: "${c.name}" (ID: ${c.id})${diff}${desc}`;
    }),
    `======================================\n`,
  ];

  return lines.join('\n');
}
