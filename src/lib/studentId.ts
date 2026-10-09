/**
 * src/lib/studentId.ts
 *
 * Utilities for generating and validating stable, non-sensitive,
 * human-readable student identifiers (e.g. EDU-XXXXXXXX).
 */

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 characters, no ambiguous chars (0/O, 1/I)

/**
 * Generates a stable, unique, collision-resistant student ID from the user's Firebase UID.
 * Being deterministic, a student will always have the exact same ID for their account.
 */
export function generateStudentId(uid: string): string {
  if (!uid || typeof uid !== 'string') {
    return 'EDU-00000000';
  }

  // 1. Calculate a 32-bit FNV-1a hash of the UID
  let h1 = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    h1 ^= uid.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }

  // 2. Generate 8 characters with high dispersion
  let result = '';
  const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  for (let i = 0; i < 8; i++) {
    const uidChar = cleanUid[i % cleanUid.length] || 'E';
    const charCode = uidChar.charCodeAt(0);
    h1 = Math.imul(h1 ^ (charCode * (i + 13)), 0x5bd1e995);
    h1 ^= h1 >>> 15;
    const index = Math.abs(h1) % ID_ALPHABET.length;
    result += ID_ALPHABET[index];
  }

  return `EDU-${result}`;
}

/**
 * Normalizes a student ID or search query to uppercase, trims whitespace,
 * and automatically adds "EDU-" prefix if only the 8-character body was provided.
 */
export function normalizeStudentId(input: string): string {
  const clean = input.trim().toUpperCase();
  if (!clean.startsWith("EDU-") && /^[A-Z0-9]{8}$/.test(clean)) {
    return `EDU-${clean}`;
  }
  return clean;
}

/**
 * Validates whether a string matches the EDU-XXXXXXXX student ID pattern.
 */
export function isValidStudentId(input: string): boolean {
  return /^EDU-[A-Z0-9]{8}$/.test(normalizeStudentId(input));
}
