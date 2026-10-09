/**
 * src/app/api/ai/analyze/route.ts
 *
 * Secure server-side endpoint for grounded educational context analysis.
 * Verifies:
 * - Authentication & profile
 * - Course ownership (teacher) or active enrollment (student)
 * - Strict cross-course context isolation for all requested chunks and concepts
 * - Server-side Agnes 3.0 Flash execution with validated structured response
 */

import { NextRequest, NextResponse } from 'next/server';
import { agnesService } from '@/services/ai/agnesService';
import { courseService } from '@/services/courses/courseService';
import { materialService } from '@/services/materials/materialService';
import { conceptService } from '@/services/knowledge/conceptService';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { MaterialChunk, Concept } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, courseId, chunkIds, conceptIds = [], language = 'en' } = body;

    // 1. Authentication Check
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Input Parameter Validation
    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: courseId is required.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request: chunkIds must be a non-empty array of chunk IDs.' },
        { status: 400 }
      );
    }

    // 3. User & Course Authorization
    const [profile, courseRes] = await Promise.all([
      getUserProfile(userId),
      courseService.getCourseById(courseId),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized: User profile not found.' },
        { status: 401 }
      );
    }

    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json(
        { error: 'Course not found.' },
        { status: 404 }
      );
    }

    const course = courseRes.data;

    // Teachers must own the course
    if (profile.role === 'teacher') {
      if (course.teacherId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to analyze materials for this course.' },
          { status: 403 }
        );
      }
    } else {
      // Students must be actively enrolled
      const membersRes = await courseService.listCourseMembers(courseId);
      const isEnrolled = membersRes.success && membersRes.data?.some(
        (m) => m.studentId === userId && m.status === 'active'
      );

      if (!isEnrolled) {
        return NextResponse.json(
          { error: 'Forbidden: You are not enrolled in this course.' },
          { status: 403 }
        );
      }
    }

    // 4. Fetch Chunks and Enforce Strict Course Scoping
    const chunks: MaterialChunk[] = [];
    for (const chunkId of chunkIds) {
      const cRes = await materialService.getMaterialChunkById(chunkId);
      if (!cRes.success || !cRes.data) {
        return NextResponse.json(
          { error: `Chunk "${chunkId}" was not found.` },
          { status: 404 }
        );
      }

      if (cRes.data.courseId !== courseId) {
        return NextResponse.json(
          {
            error: `Security violation: Chunk "${chunkId}" does not belong to course "${courseId}". Cross-course context is prohibited.`,
          },
          { status: 400 }
        );
      }

      chunks.push(cRes.data);
    }

    // 5. Fetch Concepts if requested and verify course scoping
    const concepts: Concept[] = [];
    if (Array.isArray(conceptIds) && conceptIds.length > 0) {
      for (const conceptId of conceptIds) {
        const concRes = await conceptService.getConceptById(conceptId);
        if (concRes.success && concRes.data) {
          if (concRes.data.courseId !== courseId) {
            return NextResponse.json(
              {
                error: `Security violation: Concept "${conceptId}" does not belong to course "${courseId}".`,
              },
              { status: 400 }
            );
          }
          concepts.push(concRes.data);
        }
      }
    }

    // 6. Execute AI Analysis
    const analysisRes = await agnesService.analyzeEducationalContext({
      courseId,
      selectedChunks: chunks,
      selectedConcepts: concepts,
      language,
      userId,
    });

    if (!analysisRes.success) {
      return NextResponse.json(
        { error: analysisRes.error || 'Failed to complete educational analysis.' },
        { status: 502 }
      );
    }


    return NextResponse.json({
      success: true,
      data: analysisRes.data,
    });
  } catch (err: unknown) {
    console.error('[API /api/ai/analyze] Internal error:', err);
    return NextResponse.json(
      { error: 'Internal server error while performing AI analysis.' },
      { status: 500 }
    );
  }
}
