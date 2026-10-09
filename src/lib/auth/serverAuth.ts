/**
 * src/lib/auth/serverAuth.ts
 *
 * Server-side authorization helpers for API routes and backend services.
 * Enforces strict teacher boundaries, account active states, and administrative secrets.
 */

import { NextRequest } from 'next/server';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/types';

export interface TeacherAuthResult {
  authorized: boolean;
  profile?: UserProfile;
  error?: string;
  statusCode?: number;
}

/**
 * Validates that a userId belongs to an active, authorized teacher.
 * Rejects missing users, non-existent profiles, deactivated accounts, and students.
 */
export async function verifyTeacherAuth(userId: string): Promise<TeacherAuthResult> {
  const trimmed = userId?.trim();
  if (!trimmed) {
    return {
      authorized: false,
      error: 'Unauthorized: Missing user identifier.',
      statusCode: 401,
    };
  }

  const profile = await getUserProfile(trimmed);
  if (!profile) {
    return {
      authorized: false,
      error: 'Unauthorized: User profile not found.',
      statusCode: 401,
    };
  }

  if (profile.isActive === false) {
    return {
      authorized: false,
      error: 'Forbidden: Account has been deactivated. Please contact an administrator.',
      statusCode: 403,
    };
  }

  if (profile.role !== 'teacher') {
    return {
      authorized: false,
      error: 'Forbidden: Only authorized teachers may access this resource.',
      statusCode: 403,
    };
  }

  return {
    authorized: true,
    profile,
    statusCode: 200,
  };
}

/**
 * Validates administrative requests using the server-only ADMIN_PROVISIONING_SECRET.
 * Secret can be provided via header 'x-admin-secret' or 'authorization: Bearer <secret>'.
 */
export function verifyAdminSecret(req: Request | NextRequest): { authorized: boolean; error?: string } {
  const configuredSecret = process.env.ADMIN_PROVISIONING_SECRET;

  if (!configuredSecret) {
    console.error('[Admin Auth] ADMIN_PROVISIONING_SECRET environment variable is not configured.');
    return {
      authorized: false,
      error: 'Server configuration error: ADMIN_PROVISIONING_SECRET is not configured on the server.',
    };
  }

  // Extract from x-admin-secret header
  const headerSecret = req.headers.get('x-admin-secret')?.trim();
  if (headerSecret && headerSecret === configuredSecret) {
    return { authorized: true };
  }

  // Extract from Authorization header: Bearer <token>
  const authHeader = req.headers.get('authorization')?.trim();
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken === configuredSecret) {
      return { authorized: true };
    }
  }

  return {
    authorized: false,
    error: 'Unauthorized: Invalid or missing administrator secret.',
  };
}
