/**
 * src/services/documents/textCleaner.ts
 *
 * Conservative, deterministic text cleaner for educational PDF material.
 * Preserves programming code, indentation, headings, and paragraph boundaries.
 * No aggressive rewriting, no LLM summarization, faithful to source document.
 */

/**
 * Cleans extracted text conservatively.
 * Preserves code syntax, indentation, and structure while removing extraction noise.
 */
export function cleanExtractedText(rawText: string): string {
  if (!rawText) return '';

  // 1. Remove binary/extraction control characters (null, form feed, replacement char)
  let text = rawText
    .replace(/\0/g, '')
    .replace(/\f/g, '\n\n')
    .replace(/\uFFFD/g, '');

  // 2. Normalize Windows/Mac line endings to standard Unix line feed
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Process line-by-line to preserve indentation for code while trimming trailing whitespace
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    // Trim trailing whitespace from each line
    const withoutTrailing = line.replace(/[ \t]+$/, '');

    // If line has leading indentation (code block or nested list), preserve the indent
    const indentMatch = withoutTrailing.match(/^([ \t]+)/);
    if (indentMatch) {
      // Normalize internal multiple consecutive spaces on the rest of the line only if not inside code quotes
      cleanedLines.push(withoutTrailing);
    } else {
      // Non-indented line: clean up excessive internal whitespace sequences (e.g., 4+ spaces)
      const normalizedLine = withoutTrailing.replace(/[ \t]{4,}/g, ' ');
      cleanedLines.push(normalizedLine);
    }
  }

  // 4. Re-join lines
  text = cleanedLines.join('\n');

  // 5. Normalize excessive blank lines (more than 2 consecutive newlines -> 2 newlines)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Checks whether a text line appears to be a section heading.
 * Useful for annotating chunks with sectionTitle metadata.
 */
export function detectHeading(line: string): string | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return undefined;

  // Patterns matching typical educational headings:
  // e.g. "Chapter 1: Introduction", "1.2 Memory Management", "SECTION 4", "Functions & Pointers"
  const headingRegexes = [
    /^(?:Chapter|Section|Module|Unit|Lesson|Part)\s+\d+/i,
    /^\d+(?:\.\d+)+\s+[A-Z]/,
    /^[A-Z][A-Za-z0-9\s,:—–-]{3,60}$/,
  ];

  for (const regex of headingRegexes) {
    if (regex.test(trimmed)) {
      return trimmed;
    }
  }

  return undefined;
}
