/**
 * src/app/api/ai/conflict/route.ts
 *
 * Phase 8: Secure server-side endpoint for AI-powered source conflict detection.
 *
 * Security:
 * - Teacher-only access: only course owners may trigger conflict analysis
 * - Both chunks must belong to the requesting course (cross-course prohibited)
 * - Agnes API key never exposed to browser
 * - Structured input validation via Zod before any AI call
 *
 * Architecture note:
 * - This route detects conflicts only. Resolution is handled by the teacher
 *   through PATCH /api/courses/[courseId]/conflicts/[conflictId].
 */

import { NextRequest, NextResponse } from 'next/server';
import { agnesService } from '@/services/ai/agnesService';
import { courseService } from '@/services/courses/courseService';
import { materialService } from '@/services/materials/materialService';
import { conflictService } from '@/services/conflict/conflictService';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';
import { analyzeConflictSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 1. Validate input structure
    const parseResult = analyzeConflictSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Bad Request: Invalid input.',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const { courseId, materialIdA, chunkIdA, materialIdB, chunkIdB, conceptId, conceptName, language, userId } = input;

    // 2. Authentication & Teacher Gate
    const authResult = await verifyTeacherAuth(userId);
    if (!authResult.authorized || authResult.profile?.role !== 'teacher') {
      return NextResponse.json(
        { error: authResult.error || 'Forbidden: Only teachers may trigger conflict analysis.' },
        { status: authResult.statusCode || 403 }
      );
    }

    // 4. Course ownership check
    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (courseRes.data.teacherId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this course.' },
        { status: 403 }
      );
    }

    // 5. Fetch and validate chunk A
    const chunkARes = await materialService.getMaterialChunkById(chunkIdA);
    if (!chunkARes.success || !chunkARes.data) {
      return NextResponse.json(
        { error: `Chunk A "${chunkIdA}" was not found.` },
        { status: 404 }
      );
    }
    if (chunkARes.data.courseId !== courseId) {
      return NextResponse.json(
        { error: `Security violation: Chunk A does not belong to course "${courseId}".` },
        { status: 400 }
      );
    }
    if (chunkARes.data.materialId !== materialIdA) {
      return NextResponse.json(
        { error: `Chunk A does not belong to materialIdA "${materialIdA}".` },
        { status: 400 }
      );
    }

    // 6. Fetch and validate chunk B
    const chunkBRes = await materialService.getMaterialChunkById(chunkIdB);
    if (!chunkBRes.success || !chunkBRes.data) {
      return NextResponse.json(
        { error: `Chunk B "${chunkIdB}" was not found.` },
        { status: 404 }
      );
    }
    if (chunkBRes.data.courseId !== courseId) {
      return NextResponse.json(
        { error: `Security violation: Chunk B does not belong to course "${courseId}".` },
        { status: 400 }
      );
    }
    if (chunkBRes.data.materialId !== materialIdB) {
      return NextResponse.json(
        { error: `Chunk B does not belong to materialIdB "${materialIdB}".` },
        { status: 400 }
      );
    }

    // 7. Same-material check (comparing a chunk to itself is not meaningful)
    if (materialIdA === materialIdB) {
      return NextResponse.json(
        { error: 'Bad Request: Both chunks belong to the same material. Conflict analysis requires two different materials.' },
        { status: 400 }
      );
    }

    // 8. Load trust profiles for provenance context (optional — conflicts still run without profiles)
    const [profileARes, profileBRes] = await Promise.all([
      conflictService.getSourceProfile(courseId, materialIdA),
      conflictService.getSourceProfile(courseId, materialIdB),
    ]);

    const profileA = profileARes.success ? profileARes.data : null;
    const profileB = profileBRes.success ? profileBRes.data : null;

    // 9. Execute conflict analysis
    const conflictRes = await agnesService.analyzeSourceConflict({
      courseId,
      chunkA: chunkARes.data,
      materialTitleA: profileA?.materialTitle ?? materialIdA,
      chunkB: chunkBRes.data,
      materialTitleB: profileB?.materialTitle ?? materialIdB,
      conceptId,
      conceptName,
      language,
      userId,
      trustTierA: profileA?.trustTier,
      trustTierB: profileB?.trustTier,
    });

    if (!conflictRes.success) {
      return NextResponse.json(
        { error: conflictRes.error || 'Conflict analysis failed.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conflictRes.data,
      meta: {
        conflictsPersisted: conflictRes.data.conflicts.length,
        noConflictsFound: conflictRes.data.noConflictsFound,
        insufficientContext: conflictRes.data.insufficientContext,
      },
    });
  } catch (err: unknown) {
    console.error('[API /api/ai/conflict] Internal error:', err);
    return NextResponse.json(
      { error: 'Internal server error during conflict analysis.' },
      { status: 500 }
    );
  }
}
