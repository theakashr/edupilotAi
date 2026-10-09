import { Timestamp } from 'firebase/firestore';

/**
 * Returns the current server-side Firestore Timestamp.
 * Use this whenever a document needs createdAt or updatedAt.
 */
export const nowTimestamp = (): Timestamp => Timestamp.now();

/**
 * Converts a JavaScript Date to a Firestore Timestamp.
 */
export const toTimestamp = (date: Date): Timestamp =>
  Timestamp.fromDate(date);

/**
 * Converts a Firestore Timestamp to a JavaScript Date.
 */
export const toDate = (ts: Timestamp): Date => ts.toDate();

/**
 * Converts a Firestore Timestamp to a Unix millisecond number.
 * Useful when interfacing with legacy UserProfile fields (createdAt: number).
 */
export const toUnixMs = (ts: Timestamp): number => ts.toMillis();

/**
 * Converts a Unix millisecond number to a Firestore Timestamp.
 */
export const fromUnixMs = (ms: number): Timestamp =>
  Timestamp.fromMillis(ms);

/**
 * Formats a Firestore Timestamp for human-readable display.
 * e.g. "8 Oct 2026"
 */
export const formatTimestamp = (
  ts: Timestamp,
  locale = 'en-GB',
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
): string => ts.toDate().toLocaleDateString(locale, options);
