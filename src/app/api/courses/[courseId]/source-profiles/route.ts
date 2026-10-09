/**
 * src/app/api/courses/[courseId]/source-profiles/route.ts
 *
 * Phase 8: Source trust profile management for a course.
 *
 * GET  — List all trust profiles for the course
 * POST — Create or update (upsert) a trust profile for a material
 */

import { NextRequest, NextResponse } from 'next/server';
import { conflictService } from '@/services/conflict/conflictService';
import { courseService } from '@/services/courses/courseService';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';
import { createSourceProfileSchema } from '@/lib/validation';

type RouteContext = { params: Promise<{ courseId: string }> };

// ─── GET: List all source profiles for a course ───────────────────────────────

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const userId = req.nextUrl.searchParams.get('userId') ?? '';

    // 1. Auth & Teacher Verification
    const authResult = await verifyTeacherAuth(userId);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden: Requires teacher privileges.' },
        { status: authResult.statusCode || 403 }
      );
    }

    const courseRes = await courseService.getCourseById(courseId);
    if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const profilesRes = await conflictService.listCourseSourceProfiles(courseId);
    if (!profilesRes.success) {
      return NextResponse.json(
        { error: profilesRes.error || 'Failed to list source profiles.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: profilesRes.data });
  } catch (err: unknown) {
    console.error('[API source-profiles GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// ─── POST: Upsert a source trust profile ─────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const body = await req.json().catch(() => ({}));

    // 1. Auth & Teacher Verification
    const userId = body.userId ?? body.setBy ?? '';
    const authResult = await verifyTeacherAuth(userId);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden: Only teachers may set source trust profiles.' },
        { status: authResult.statusCode || 403 }
      );
    }

    // 2. Course ownership
    const courseRes = await courseService.getCourseById(courseId);
    if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // 3. Validate input — inject courseId and setBy from verified context
    const parseResult = createSourceProfileSchema.safeParse({
      ...body,
      courseId,
      setBy: userId,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Bad Request: Invalid source profile data.',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 4. Upsert
    const upsertRes = await conflictService.upsertSourceProfile(parseResult.data);
    if (!upsertRes.success) {
      return NextResponse.json(
        { error: upsertRes.error || 'Failed to save source profile.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: upsertRes.data });
  } catch (err: unknown) {
    console.error('[API source-profiles POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
