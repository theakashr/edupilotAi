/**
 * src/services/documents/pdfExtractor.ts
 *
 * Server-side PDF text extraction engine using unpdf.
 * Preserves individual page numbers and page boundaries for grounded citations.
 * Detects image-only/scanned documents without running fake OCR or invoking LLMs.
 */

import { extractText } from 'unpdf';
import { DEFAULT_DOCUMENT_CONFIG } from './config';

export interface ExtractedPage {
  /** 1-indexed page number matching the original PDF */
  pageNumber: number;
  /** Raw text extracted from this page */
  text: string;
}

export interface PdfExtractionResult {
  /** Total number of pages in the PDF document */
  pageCount: number;
  /** Extracted pages array with 1-indexed page numbers */
  pages: ExtractedPage[];
  /** Total non-whitespace character count across all pages */
  totalCharacters: number;
  /** Whether the document contains meaningful extractable text */
  hasExtractableText: boolean;
}

export class PdfExtractorError extends Error {
  readonly isScannedOrEmpty: boolean;

  constructor(message: string, isScannedOrEmpty: boolean = false) {
    super(message);
    this.name = 'PdfExtractorError';
    this.isScannedOrEmpty = isScannedOrEmpty;
  }
}

/**
 * Extracts textual content from a PDF binary, preserving page numbers.
 *
 * @param pdfBuffer - Uint8Array or Buffer containing the PDF binary
 * @param minChars - Minimum required characters across the entire PDF
 * @returns PdfExtractionResult containing page-by-page extracted text
 */
export async function extractPdfText(
  pdfBuffer: Uint8Array | ArrayBuffer,
  minChars = DEFAULT_DOCUMENT_CONFIG.minExtractableTextChars
): Promise<PdfExtractionResult> {
  try {
    const data =
      pdfBuffer instanceof Uint8Array
        ? pdfBuffer
        : new Uint8Array(pdfBuffer);

    // extractText with mergePages: false returns string[] where index i is page (i+1)
    const result = await extractText(data, { mergePages: false });

    const rawPages: string[] = Array.isArray(result.text)
      ? result.text
      : [String(result.text || '')];

    const pageCount = result.totalPages || rawPages.length || 0;

    let totalCharacters = 0;
    const pages: ExtractedPage[] = [];

    for (let i = 0; i < rawPages.length; i++) {
      const pageText = rawPages[i] || '';
      const trimmedText = pageText.trim();
      const pageNumber = i + 1;

      totalCharacters += trimmedText.replace(/\s+/g, '').length;

      pages.push({
        pageNumber,
        text: pageText,
      });
    }

    // Detect image-only or scanned PDF documents
    if (totalCharacters < minChars) {
      throw new PdfExtractorError(
        'This PDF does not contain extractable text. OCR support will be added in a future phase.',
        true
      );
    }

    return {
      pageCount,
      pages,
      totalCharacters,
      hasExtractableText: true,
    };
  } catch (err: unknown) {
    if (err instanceof PdfExtractorError) {
      throw err;
    }

    const message =
      err instanceof Error ? err.message : 'Unknown PDF extraction failure';

    // Check for password protection / encrypted PDF
    if (message.toLowerCase().includes('password') || message.toLowerCase().includes('encrypted')) {
      throw new PdfExtractorError('This PDF is password-protected or encrypted.');
    }

    throw new PdfExtractorError(
      'Unable to extract text from this PDF document.'
    );
  }
}
