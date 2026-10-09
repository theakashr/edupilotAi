/**
 * src/app/api/ai/agnes/test/route.ts
 *
 * Secure server-side health check endpoint for Agnes 3.0 Flash.
 * Requirements:
 * - Requires authentication (userId required).
 * - Restricted to teachers and administrators.
 * - Does not expose the API key or raw provider headers.
 * - Truthful operational status (fails if Agnes is unreachable or unconfigured).
 */

import { NextRequest, NextResponse } from 'next/server';
import { agnesService } from '@/services/ai/agnesService';
import { getUserProfile } from '@/lib/firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    // 1. Enforce authentication requirement
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication is required to run AI diagnostics.' },
        { status: 401 }
      );
    }

    // 2. Enforce teacher/admin role restriction
    const profile = await getUserProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized: User profile not found.' },
        { status: 401 }
      );
    }

    if (profile.role !== 'teacher' && (profile.role as string) !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Agnes diagnostics are restricted to teachers and administrators.' },
        { status: 403 }
      );
    }

    // 3. Execute operational health check
    const result = await agnesService.testAgnesConnection({ userId });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          operational: false,
          error: result.error || 'Agnes operational test failed.',
        },
        { status: 503 }
      );
    }


    return NextResponse.json({
      success: true,
      operational: true,
      model: result.data.model,
      message: result.data.message,
      timestamp: result.data.timestamp,
    });
  } catch (err: unknown) {
    console.error('[API /api/ai/agnes/test] Internal error:', err);
    return NextResponse.json(
      { error: 'Internal server error while executing Agnes health check.' },
      { status: 500 }
    );
  }
}
