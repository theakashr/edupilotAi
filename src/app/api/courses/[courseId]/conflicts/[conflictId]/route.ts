/**
 * src/app/api/courses/[courseId]/conflicts/[conflictId]/route.ts
 *
 * Phase 8: Get a single conflict and resolve it (teacher action only).
 *
 * GET  — Retrieve a single conflict with full provenance
 * PATCH — Teacher resolution action (status, resolution note, trustedMaterialId)
 *
 * HUMAN-IN-THE-LOOP ENFORCEMENT:
 * The PATCH endpoint is the ONLY code path that can move a conflict out of 'pending'.
 * It requires teacher authentication + course ownership before mutating the record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { conflictService } from '@/services/conflict/conflictService';
import { courseService } from '@/services/courses/courseService';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';
import { resolveConflictSchema } from '@/lib/validation';
import { aiService } from '@/services/ai/aiService';

type RouteContext = { params: Promise<{ courseId: string; conflictId: string }> };

// ─── GET: Fetch a single conflict ─────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { courseId, conflictId } = await params;
    const userId = req.nextUrl.searchParams.get('userId') ?? '';

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

    const conflictRes = await conflictService.getConflictById(conflictId);
    if (!conflictRes.success || !conflictRes.data) {
      return NextResponse.json({ error: 'Conflict not found.' }, { status: 404 });
    }

    // Course isolation: the conflict must belong to this course
    if (conflictRes.data.courseId !== courseId) {
      return NextResponse.json(
        { error: 'Forbidden: Conflict does not belong to this course.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: conflictRes.data });
  } catch (err: unknown) {
    console.error('[API conflicts/[conflictId] GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// ─── PATCH: Teacher resolves a conflict ───────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { courseId, conflictId } = await params;
    const body = await req.json().catch(() => ({}));
    const userId = body.userId ?? '';

    // 1. Auth & Teacher Verification
    const authResult = await verifyTeacherAuth(userId);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden: Only teachers may resolve conflicts.' },
        { status: authResult.statusCode || 403 }
      );
    }

    // 2. Course ownership
    const courseRes = await courseService.getCourseById(courseId);
    if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // 4. Validate resolution payload
    const parseResult = resolveConflictSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Bad Request: Invalid resolution payload.',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const resolution = parseResult.data;

    // 5. Fetch conflict and verify course scope
    const conflictRes = await conflictService.getConflictById(conflictId);
    if (!conflictRes.success || !conflictRes.data) {
      return NextResponse.json({ error: 'Conflict not found.' }, { status: 404 });
    }
    if (conflictRes.data.courseId !== courseId) {
      return NextResponse.json(
        { error: 'Forbidden: Conflict does not belong to this course.' },
        { status: 403 }
      );
    }

    // 6. Prevent re-resolving an already-resolved conflict
    if (conflictRes.data.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Conflict is already resolved (status: "${conflictRes.data.status}"). Create a new analysis to re-examine.`,
        },
        { status: 409 }
      );
    }

    // 7. Validate trustedMaterialId belongs to this conflict
    if (
      resolution.trustedMaterialId &&
      resolution.trustedMaterialId !== conflictRes.data.materialIdA &&
      resolution.trustedMaterialId !== conflictRes.data.materialIdB
    ) {
      return NextResponse.json(
        {
          error: `trustedMaterialId "${resolution.trustedMaterialId}" does not match either source material in this conflict.`,
        },
        { status: 400 }
      );
    }

    // 8. Apply resolution
    const resolveRes = await conflictService.resolveConflict(conflictId, {
      status: resolution.status,
      resolution: resolution.resolution,
      trustedMaterialId: resolution.trustedMaterialId,
      teacherId: userId,
    });

    if (!resolveRes.success) {
      return NextResponse.json(
        { error: resolveRes.error || 'Failed to resolve conflict.' },
        { status: 500 }
      );
    }

    // 9. Audit: log teacher override in the AI decision events trail
    await aiService
      .logDecisionEvent({
        courseId,
        eventType: 'teacher_override',
        summary: `Teacher resolved conflict "${conflictId}" with status "${resolution.status}"`,
        reasoning: `Teacher (${userId}) resolution: "${resolution.resolution}". Trusted material: ${resolution.trustedMaterialId ?? 'none / both acceptable'}.`,
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Conflict resolved with status "${resolution.status}".`,
    });
  } catch (err: unknown) {
    console.error('[API conflicts/[conflictId] PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
