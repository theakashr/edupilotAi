/**
 * src/app/api/courses/[courseId]/conflicts/route.ts
 *
 * Phase 8: List all source conflicts for a course.
 * Teacher-only access: lists all conflicts (optionally filtered by status).
 */

import { NextRequest, NextResponse } from 'next/server';
import { conflictService } from '@/services/conflict/conflictService';
import { courseService } from '@/services/courses/courseService';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';
import type { ConflictStatus } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') ?? '';
    const statusFilter = searchParams.get('status') as ConflictStatus | null;

    // 1. Auth & Teacher Verification
    const authResult = await verifyTeacherAuth(userId);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden: Requires teacher privileges.' },
        { status: authResult.statusCode || 403 }
      );
    }

    // 2. Course ownership
    const courseRes = await courseService.getCourseById(courseId);
    if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this course.' }, { status: 403 });
    }

    // 4. List conflicts
    const conflictsRes = await conflictService.listCourseConflicts(courseId, {
      statusFilter: statusFilter ?? undefined,
    });

    if (!conflictsRes.success) {
      return NextResponse.json(
        { error: conflictsRes.error || 'Failed to list conflicts.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conflictsRes.data,
      count: conflictsRes.data?.length ?? 0,
    });
  } catch (err: unknown) {
    console.error('[API /courses/[courseId]/conflicts GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
