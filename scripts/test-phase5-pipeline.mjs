/**
 * scripts/test-phase5-pipeline.mjs
 *
 * Empirical verification suite for Phase 5 Document Ingestion & PDF Extraction Pipeline.
 * Tests PDF extraction, page preservation, code formatting, chunking, and edge cases.
 */

import { extractPdfText, PdfExtractorError } from '../src/services/documents/pdfExtractor.ts';
import { cleanExtractedText } from '../src/services/documents/textCleaner.ts';
import { chunkExtractedPages } from '../src/services/documents/textChunker.ts';
import { createMaterialChunkSchema } from '../src/lib/validation/index.ts';

// ─── HELPER: Generate Synthetic 2-Page Educational PDF with Code ─────────────
function generateSyntheticTwoPagePdf() {
  const contentPage1 = `BT
/F1 14 Tf
72 720 Td
(Chapter 1: Foundations of Algorithms) Tj
ET
BT
/F1 10 Tf
72 690 Td
(Data structures organize data in memory efficiently.) Tj
0 -20 Td
(Key requirements for computer science students:) Tj
0 -20 Td
(1. Time complexity analysis using Big-O notation) Tj
0 -18 Td
(2. Space complexity boundaries) Tj
0 -18 Td
(3. Cache-friendly array traversals) Tj
ET`;

  const contentPage2 = `BT
/F1 14 Tf
72 720 Td
(Section 1.2: Implementation in C) Tj
ET
BT
/F1 10 Tf
72 685 Td
(#include <stdio.h>) Tj
0 -18 Td
(int main() {) Tj
0 -18 Td
(    int values[] = {10, 20, 30};) Tj
0 -18 Td
(    printf("First value: %d\\n", values[0]);) Tj
0 -18 Td
(    return 0;) Tj
0 -18 Td
(}) Tj
ET`;

  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R 5 0 R]/Count 2>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<<>>>>endobj
4 0 obj<</Length ${contentPage1.length}>>stream
${contentPage1}
endstream
endobj
5 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 6 0 R/Resources<<>>>>endobj
6 0 obj<</Length ${contentPage2.length}>>stream
${contentPage2}
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000109 00000 n 
0000000204 00000 n 
0000000450 00000 n 
0000000545 00000 n 
trailer<</Size 7/Root 1 0 R>>
startxref
790
%%EOF`;

  return Buffer.from(pdf, 'binary');
}

// ─── HELPER: Generate Scanned / Blank PDF (Zero extractable text) ─────────────
function generateBlankPdf() {
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<<>>>>endobj
4 0 obj<</Length 0>>stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000196 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
240
%%EOF`;
  return Buffer.from(pdf, 'binary');
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 5 TEST SUITE: DOCUMENT INGESTION & EXTRACTION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
    }
  }

  // ─── TEST 1 & 2: Multi-Page Extraction & Page Preservation ──────────────────
  console.log('--- TEST 1 & 2: Multi-Page Extraction & Page Preservation ---');
  const validPdfBuffer = generateSyntheticTwoPagePdf();
  const extractResult = await extractPdfText(new Uint8Array(validPdfBuffer));

  assert('Should report total page count of 2', extractResult.pageCount === 2);
  assert('Should have 2 extracted page objects', extractResult.pages.length === 2);
  assert('Page 1 has pageNumber 1', extractResult.pages[0].pageNumber === 1);
  assert('Page 2 has pageNumber 2', extractResult.pages[1].pageNumber === 2);
  assert('Page 1 contains "Foundations of Algorithms"', extractResult.pages[0].text.includes('Foundations of Algorithms'));
  assert('Page 2 contains "Implementation in C"', extractResult.pages[1].text.includes('Implementation in C'));

  // ─── TEST 3: Code Preservation & Conservative Cleaning ──────────────────────
  console.log('\n--- TEST 3: Code Preservation & Conservative Cleaning ---');
  const rawCode = `  #include <stdio.h>\n\n  int main() {\n      printf("Hello");\n      return 0;\n  }`;
  const cleanedCode = cleanExtractedText(rawCode);

  assert('Preserves #include <stdio.h>', cleanedCode.includes('#include <stdio.h>'));
  assert('Preserves code indentation', cleanedCode.includes('      printf("Hello");'));
  assert('Preserves return statement without mangling', cleanedCode.includes('return 0;'));

  // ─── TEST 4: Chunking with Page Numbers & Deterministic IDs ─────────────────
  console.log('\n--- TEST 4: Deterministic Chunking & Page Metadata ---');
  const chunks = chunkExtractedPages(
    extractResult.pages,
    'mat_test123',
    'course_abc'
  );

  assert('Generated chunks array is non-empty', chunks.length > 0);
  assert('Chunk 0 has deterministic ID format', chunks[0].id === 'mat_test123_chk_0');
  assert('Chunk 0 has correct materialId', chunks[0].materialId === 'mat_test123');
  assert('Chunk 0 has correct courseId', chunks[0].courseId === 'course_abc');
  assert('Chunk 0 retains pageNumber 1', chunks[0].pageNumber === 1);

  // Validate chunks against Phase 3 Firestore validation schema
  let allSchemasValid = true;
  for (const chunk of chunks) {
    const parseResult = createMaterialChunkSchema.safeParse(chunk);
    if (!parseResult.success) {
      allSchemasValid = false;
      console.error('Validation failure on chunk:', parseResult.error);
    }
  }
  assert('All generated chunks strictly satisfy createMaterialChunkSchema', allSchemasValid);

  // ─── TEST 5 & 6: Blank / Scanned / Empty PDF Detection ─────────────────────
  console.log('\n--- TEST 5 & 6: Blank / Scanned PDF Failure Handling ---');
  const blankPdfBuffer = generateBlankPdf();
  let caughtBlankError = false;
  try {
    await extractPdfText(new Uint8Array(blankPdfBuffer));
  } catch (err) {
    if (err instanceof PdfExtractorError && err.isScannedOrEmpty) {
      caughtBlankError = true;
    }
  }
  assert('Scanned / Empty PDF triggers PdfExtractorError with isScannedOrEmpty', caughtBlankError);

  // ─── TEST 7 & 8: Reprocessing Idempotency ──────────────────────────────────
  console.log('\n--- TEST 7 & 8: Idempotent Chunk Generation ---');
  const secondPassChunks = chunkExtractedPages(
    extractResult.pages,
    'mat_test123',
    'course_abc'
  );
  assert('Reprocessing generates identical chunk count', chunks.length === secondPassChunks.length);
  assert('Reprocessing generates identical chunk IDs', chunks[0].id === secondPassChunks[0].id);

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed}/${total} assertions passed`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
