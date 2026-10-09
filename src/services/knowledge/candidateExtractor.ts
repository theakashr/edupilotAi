/**
 * src/services/knowledge/candidateExtractor.ts
 *
 * Deterministic educational concept candidate extractor.
 * 
 * STRICT COMPLIANCE:
 * - 100% Deterministic & Explainable
 * - NO AI / LLM / Gemini / Agnes / embeddings / semantic models
 * - Extracts candidates based on document structure, headings, frequency, and cross-chunk occurrences
 * - Conservative filtering against stopwords, page numbers, and generic book artifacts
 */

import type { MaterialChunk } from '@/types';
import { detectHeading } from '../documents/textCleaner';

export interface ExtractedCandidateResult {
  name: string;
  normalizedName: string;
  description?: string;
  sourceChunkIds: string[];
  sourcePages: number[];
  relevanceScore: number;
  scoringSignals: string[];
}

// ─── Conservative Filtering Constants ───────────────────────────────────────

/** Common English stop words that must NEVER become concepts */
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'aren', 'arent', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'itself', 'let', 'me', 'more', 'most', 'my', 'myself', 'no',
  'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
]);

/** Generic educational book / document artifacts that must NEVER become concepts */
const GENERIC_EDUCATIONAL_TERMS = new Set([
  'chapter', 'section', 'part', 'unit', 'module', 'lesson', 'page', 'pages',
  'table', 'tables', 'figure', 'figures', 'illustration', 'diagram',
  'introduction', 'intro', 'overview', 'summary', 'conclusion', 'review',
  'exercise', 'exercises', 'problem', 'problems', 'solution', 'solutions',
  'example', 'examples', 'sample', 'samples', 'note', 'notes', 'tip', 'tips',
  'warning', 'caution', 'notice', 'important', 'index', 'contents',
  'table of contents', 'appendix', 'glossary', 'bibliography', 'references',
  'syllabus', 'course', 'subject', 'instructor', 'author', 'title', 'version',
  'objective', 'objectives', 'learning objectives', 'key terms', 'key concepts',
  'prerequisites', 'discussion', 'questions', 'answers', 'quiz', 'test', 'exam',
  'homework', 'assignment', 'reading', 'practice', 'further reading',
]);

/**
 * Normalizes a concept name for deterministic duplicate comparison.
 * Trims extra spaces, converts to lowercase, and strips non-alphanumeric edges.
 */
export function normalizeConceptName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips numbering and structural prefixes from headings.
 * Example: "Chapter 4: Pointers and Memory" -> "Pointers and Memory"
 * Example: "3.2 Function Call Stacks" -> "Function Call Stacks"
 */
function cleanHeadingTitle(rawHeading: string): string {
  let cleaned = rawHeading.trim();

  // Remove common prefixes like "Chapter 1:", "Section 2.3 -", "Module 4:"
  cleaned = cleaned.replace(/^(?:Chapter|Section|Module|Unit|Lesson|Part)\s+\d+[\s:.-]*/i, '');

  // Remove numerical section prefixes like "1.2.3 ", "4.1 "
  cleaned = cleaned.replace(/^\d+(?:\.\d+)*[\s:.-]+/, '');

  // Strip leading/trailing punctuation
  cleaned = cleaned.replace(/^[:\-–—\s]+|[:\-–—\s]+$/g, '');

  return cleaned.trim();
}

/**
 * Validates whether a candidate term passes conservative quality filters.
 */
function isValidConceptCandidate(name: string): boolean {
  if (!name || name.length < 3 || name.length > 80) return false;

  const normalized = normalizeConceptName(name);
  if (!normalized || normalized.length < 3) return false;

  // Single word checks
  const words = normalized.split(/\s+/);
  if (words.length === 1) {
    // Single word must not be a stop word or generic term
    if (STOP_WORDS.has(words[0]) || GENERIC_EDUCATIONAL_TERMS.has(words[0])) return false;
    // Single word must not be a number or date
    if (/^\d+$/.test(words[0])) return false;
    // Single word must have at least 3 letters
    if (words[0].length < 3) return false;
  }

  // Multi-word phrase checks
  if (GENERIC_EDUCATIONAL_TERMS.has(normalized)) return false;

  // If every word in the phrase is a stop word or generic term, reject
  const nonTrivialWords = words.filter(
    (w) => !STOP_WORDS.has(w) && !GENERIC_EDUCATIONAL_TERMS.has(w) && !/^\d+$/.test(w)
  );
  if (nonTrivialWords.length === 0) return false;

  // Reject candidates that look like URLs, filenames, or code fragments
  if (/\.(pdf|png|jpg|docx?|html?|js|ts|py|c|cpp|java)$/i.test(name)) return false;
  if (/^(http|https|www|ftp):/i.test(name)) return false;
  if (/^[0-9\s.,;:'"!?()\[\]{}_\-+=*/\\|<>#@$%^&~`]+$/.test(name)) return false;

  return true;
}

/**
 * Extracts candidate terms from chunk text using deterministic regex patterns.
 * Identifies:
 * 1. Capitalized multi-word technical entities (e.g. "Binary Search Tree", "Pointer Arithmetic")
 * 2. Explicit definition patterns (e.g. "X is defined as...", "X refers to...")
 */
function extractPhrasesFromText(text: string): string[] {
  const phrases: string[] = [];

  // Pattern 1: Title-cased phrases (2-4 words, e.g. "Dynamic Memory Allocation", "Linked List")
  const titleCaseRegex = /\b([A-Z][a-z0-9]+(?:\s+(?:and|of|in|to|for|with)\s+[A-Z][a-z0-9]+|\s+[A-Z][a-z0-9]+){1,3})\b/g;
  let match: RegExpExecArray | null;

  while ((match = titleCaseRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (isValidConceptCandidate(candidate)) {
      phrases.push(candidate);
    }
  }

  // Pattern 2: Explicit definition patterns: e.g. "A pointer is a variable", "Recursion is the process"
  const definitionRegex = /(?:^|\.\s+)([A-Z][A-Za-z0-9\s-]{2,40}?)\s+(?:is defined as|refers to|is a fundamental|is an algorithm|is a data structure|is a mechanism|is a concept)\b/g;
  while ((match = definitionRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (isValidConceptCandidate(candidate)) {
      phrases.push(candidate);
    }
  }

  return phrases;
}

/**
 * Extracts educational concept candidates deterministically from a collection of chunks.
 *
 * @param chunks - Array of MaterialChunk extracted from educational PDF
 * @returns Array of ExtractedCandidateResult sorted by relevanceScore descending
 */
export function extractConceptCandidates(chunks: MaterialChunk[]): ExtractedCandidateResult[] {
  if (!chunks || chunks.length === 0) return [];

  interface CandidateAccumulator {
    name: string;
    normalizedName: string;
    sampleDescription?: string;
    chunkIds: Set<string>;
    pages: Set<number>;
    isHeading: boolean;
    headingCount: number;
    occurrenceCount: number;
    hasDefinitionPattern: boolean;
  }

  const accumulatorMap = new Map<string, CandidateAccumulator>();

  for (const chunk of chunks) {
    const pageNum = chunk.pageNumber ?? 1;

    // 1. Process explicit sectionTitle on chunk metadata (High signal)
    if (chunk.sectionTitle) {
      const cleaned = cleanHeadingTitle(chunk.sectionTitle);
      if (isValidConceptCandidate(cleaned)) {
        const norm = normalizeConceptName(cleaned);
        const acc = accumulatorMap.get(norm) ?? {
          name: cleaned,
          normalizedName: norm,
          chunkIds: new Set<string>(),
          pages: new Set<number>(),
          isHeading: true,
          headingCount: 0,
          occurrenceCount: 0,
          hasDefinitionPattern: false,
        };
        acc.isHeading = true;
        acc.headingCount += 1;
        acc.chunkIds.add(chunk.id);
        acc.pages.add(pageNum);
        acc.occurrenceCount += 2;
        accumulatorMap.set(norm, acc);
      }
    }

    // 2. Scan chunk text for in-body section headings
    const lines = chunk.text.split('\n');
    for (const line of lines) {
      const heading = detectHeading(line);
      if (heading) {
        const cleaned = cleanHeadingTitle(heading);
        if (isValidConceptCandidate(cleaned)) {
          const norm = normalizeConceptName(cleaned);
          const acc = accumulatorMap.get(norm) ?? {
            name: cleaned,
            normalizedName: norm,
            chunkIds: new Set<string>(),
            pages: new Set<number>(),
            isHeading: true,
            headingCount: 0,
            occurrenceCount: 0,
            hasDefinitionPattern: false,
          };
          acc.isHeading = true;
          acc.headingCount += 1;
          acc.chunkIds.add(chunk.id);
          acc.pages.add(pageNum);
          acc.occurrenceCount += 1;
          accumulatorMap.set(norm, acc);
        }
      }
    }

    // 3. Scan chunk text for technical phrases and definition patterns
    const phrases = extractPhrasesFromText(chunk.text);
    for (const phrase of phrases) {
      const norm = normalizeConceptName(phrase);
      const acc = accumulatorMap.get(norm) ?? {
        name: phrase,
        normalizedName: norm,
        chunkIds: new Set<string>(),
        pages: new Set<number>(),
        isHeading: false,
        headingCount: 0,
        occurrenceCount: 0,
        hasDefinitionPattern: false,
      };
      acc.chunkIds.add(chunk.id);
      acc.pages.add(pageNum);
      acc.occurrenceCount += 1;

      // Extract brief descriptive snippet if none yet
      if (!acc.sampleDescription) {
        // Find sentence containing the phrase
        const sentences = chunk.text.split(/[.!?]\s+/);
        const matchSentence = sentences.find((s) => s.toLowerCase().includes(phrase.toLowerCase()));
        if (matchSentence) {
          acc.sampleDescription = matchSentence.trim().slice(0, 280);
        }
      }

      accumulatorMap.set(norm, acc);
    }
  }

  // 4. Calculate explainable deterministic relevance scores
  const results: ExtractedCandidateResult[] = [];

  for (const acc of accumulatorMap.values()) {
    let score = 0;
    const signals: string[] = [];

    // Heading presence (+35 points)
    if (acc.isHeading) {
      score += 35;
      signals.push('Explicit document section heading');
    }

    // Multiple heading occurrences (+15 points)
    if (acc.headingCount > 1) {
      score += 15;
      signals.push(`Appears in ${acc.headingCount} section headings`);
    }

    // Frequency across multiple distinct chunks (+10 to +25 points)
    const chunkCount = acc.chunkIds.size;
    if (chunkCount >= 3) {
      score += 25;
      signals.push(`Present across ${chunkCount} distinct document chunks`);
    } else if (chunkCount === 2) {
      score += 15;
      signals.push('Present across 2 document chunks');
    } else if (chunkCount === 1) {
      score += 5;
    }

    // Frequency across multiple distinct pages (+15 points)
    const pageCount = acc.pages.size;
    if (pageCount >= 3) {
      score += 15;
      signals.push(`Spans ${pageCount} distinct document pages`);
    } else if (pageCount === 2) {
      score += 10;
      signals.push('Spans 2 document pages');
    }

    // High occurrence volume (+10 points)
    if (acc.occurrenceCount >= 4) {
      score += 10;
      signals.push(`Frequently referenced term (${acc.occurrenceCount} occurrences)`);
    }

    // Multi-word technical concept structure (+5 points)
    if (acc.name.includes(' ')) {
      score += 5;
    }

    // Cap score at 100
    const finalScore = Math.min(100, Math.max(0, score));

    // Conservative relevance filter: require at least 35 score to qualify as candidate
    // Must either be a section heading, or appear across multiple chunks/pages
    if (finalScore >= 35 && (acc.isHeading || chunkCount >= 2 || pageCount >= 2)) {
      results.push({
        name: acc.name,
        normalizedName: acc.normalizedName,
        description: acc.sampleDescription || `Educational concept identified from ${acc.chunkIds.size} chunks across pages ${Array.from(acc.pages).sort((a, b) => a - b).join(', ')}.`,
        sourceChunkIds: Array.from(acc.chunkIds),
        sourcePages: Array.from(acc.pages).sort((a, b) => a - b),
        relevanceScore: finalScore,
        scoringSignals: signals,
      });
    }
  }

  // Sort descending by relevance score, then alphabetically
  return results.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.name.localeCompare(b.name);
  });
}
