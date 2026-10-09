/**
 * src/services/documents/documentProcessor.ts
 *
 * Orchestrates the Phase 5 document ingestion & text extraction pipeline:
 * 1. Verification (Course ownership & Material status)
 * 2. Status update to 'processing'
 * 3. Secure Server Fetch from Supabase Storage
 * 4. PDF Text Extraction (preserving page numbers)
 * 5. Conservative Text Cleaning
 * 6. Deterministic Chunking
 * 7. Safe Reprocessing (clean old chunks, batch store new chunks)
 * 8. Status update to 'ready' (or 'failed' on error)
 */

import { supabaseServer } from '@/lib/supabase/server';
import { STORAGE_BUCKET } from '@/lib/supabase/storage';
import { materialService } from '@/services/materials/materialService';
import { courseService } from '@/services/courses/courseService';
import { extractPdfText, PdfExtractorError } from './pdfExtractor';
import { chunkExtractedPages } from './textChunker';
import type { Material, MaterialStatus } from '@/types';

export interface DocumentProcessResult {
  success: boolean;
  materialId: string;
  status: MaterialStatus;
  pageCount?: number;
  chunkCount?: number;
  error?: string;
}

export interface ProcessDocumentOptions {
  materialId: string;
  requestingUserId: string;
  bypassOwnershipCheck?: boolean;
}

/**
 * Executes server-side ingestion and text extraction for an uploaded material document.
 */
export async function processDocument({
  materialId,
  requestingUserId,
  bypassOwnershipCheck = false,
}: ProcessDocumentOptions): Promise<DocumentProcessResult> {
  const startTime = Date.now();
  console.log(`[DocumentProcessor] Started processing materialId: ${materialId}`);

  let material: Material | null = null;

  try {
    // ─── STAGE 1: VERIFICATION & OWNERSHIP ────────────────────────────────────
    const matRes = await materialService.getMaterialById(materialId);
    if (!matRes.success || !matRes.data) {
      console.error(`[DocumentProcessor] Stage: VERIFY failed — Material not found: ${materialId}`);
      return {
        success: false,
        materialId,
        status: 'failed',
        error: 'Material record not found.',
      };
    }

    material = matRes.data;

    // Verify course ownership
    if (!bypassOwnershipCheck) {
      const courseRes = await courseService.getCourseById(material.courseId);
      if (!courseRes.success || !courseRes.data) {
        console.error(`[DocumentProcessor] Stage: VERIFY failed — Course not found: ${material.courseId}`);
        return {
          success: false,
          materialId,
          status: 'failed',
          error: 'Course not found.',
        };
      }

      if (courseRes.data.teacherId !== requestingUserId) {
        console.warn(
          `[DocumentProcessor] Stage: VERIFY unauthorized — User ${requestingUserId} does not own course ${material.courseId}`
        );
        return {
          success: false,
          materialId,
          status: material.status,
          error: 'You are not authorized to process materials for this course.',
        };
      }
    }

    // Check supported document type (Section 2: Phase 5 is PDF-only)
    const isPdf =
      material.type === 'pdf' ||
      material.mimeType === 'application/pdf' ||
      material.fileName.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      console.log(`[DocumentProcessor] Material ${materialId} is not a PDF (type: ${material.type}). Marked as uploaded/unsupported.`);
      await materialService.updateMaterial(materialId, {
        status: 'uploaded',
        processingError: 'Text extraction currently supports PDF documents. Other formats will be processed in a future phase.',
      });
      return {
        success: false,
        materialId,
        status: 'uploaded',
        error: 'Only PDF documents are supported for text extraction in this phase.',
      };
    }

    // Mark status as 'processing'
    await materialService.updateMaterial(materialId, {
      status: 'processing',
      processingError: undefined,
    });

    // ─── STAGE 2: FETCH (Secure Server Download from Supabase Storage) ─────────
    console.log(`[DocumentProcessor] Stage: FETCH — Downloading from Supabase: ${material.storagePath}`);
    const { data: fileBlob, error: downloadError } = await supabaseServer.storage
      .from(STORAGE_BUCKET)
      .download(material.storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message || 'Empty file'}`);
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer);

    if (pdfBuffer.length === 0) {
      throw new Error('Downloaded PDF file is empty (0 bytes).');
    }

    // ─── STAGE 3: EXTRACT (Page-by-page text extraction) ───────────────────────
    console.log(`[DocumentProcessor] Stage: EXTRACT — Extracting text from ${pdfBuffer.length} bytes`);
    const extractionResult = await extractPdfText(pdfBuffer);

    console.log(
      `[DocumentProcessor] Stage: EXTRACT completed — ${extractionResult.pageCount} pages, ${extractionResult.totalCharacters} chars`
    );

    // ─── STAGE 4 & 5: CLEAN & CHUNK ───────────────────────────────────────────
    console.log(`[DocumentProcessor] Stage: CHUNK — Creating deterministic chunks`);
    const chunks = chunkExtractedPages(
      extractionResult.pages,
      material.id,
      material.courseId
    );

    if (chunks.length === 0) {
      throw new PdfExtractorError('Unable to extract meaningful text chunks from this document.', true);
    }

    console.log(`[DocumentProcessor] Stage: CHUNK completed — Generated ${chunks.length} chunks`);

    // ─── STAGE 6: STORE (Clean old chunks + Batch Store new chunks) ───────────
    console.log(`[DocumentProcessor] Stage: STORE — Replacing existing chunks for materialId: ${materialId}`);
    // Safe reprocessing: delete any previous chunks to prevent orphaned or duplicate data
    await materialService.deleteMaterialChunks(materialId);

    // Save newly generated chunks in batch
    const storeRes = await materialService.createMaterialChunksBatch(chunks);
    if (!storeRes.success) {
      throw new Error(`Failed to store extracted chunks: ${storeRes.error}`);
    }

    // ─── STAGE 7: READY STATE ─────────────────────────────────────────────────
    await materialService.updateMaterial(materialId, {
      status: 'ready',
      pageCount: extractionResult.pageCount,
      chunkCount: chunks.length,
      processingError: undefined,
    });

    const elapsed = Date.now() - startTime;
    console.log(
      `[DocumentProcessor] Successfully processed materialId: ${materialId} in ${elapsed}ms (${extractionResult.pageCount} pages, ${chunks.length} chunks)`
    );

    return {
      success: true,
      materialId,
      status: 'ready',
      pageCount: extractionResult.pageCount,
      chunkCount: chunks.length,
    };
  } catch (err: unknown) {
    const elapsed = Date.now() - startTime;
    console.error(`[DocumentProcessor] Failed processing materialId: ${materialId} after ${elapsed}ms:`, err);

    let safeErrorMessage = 'Unable to extract text from this PDF.';

    if (err instanceof PdfExtractorError) {
      safeErrorMessage = err.message;
    } else if (err instanceof Error && err.message.includes('password')) {
      safeErrorMessage = 'This PDF is password-protected or encrypted.';
    }

    // Set material status to 'failed' with safe user error message
    if (material) {
      try {
        await materialService.updateMaterial(material.id, {
          status: 'failed',
          processingError: safeErrorMessage,
        });
      } catch (updateErr) {
        console.error(`[DocumentProcessor] Failed updating material status to 'failed':`, updateErr);
      }
    }

    return {
      success: false,
      materialId,
      status: 'failed',
      error: safeErrorMessage,
    };
  }
}
