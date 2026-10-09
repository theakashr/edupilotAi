import { NextRequest, NextResponse } from 'next/server';
import { reviewCandidateSchema } from '@/lib/validation';
import { conceptCandidateService } from '@/services/knowledge/conceptCandidateService';
import { courseService } from '@/services/courses/courseService';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...inputData } = body;

    const parseResult = reviewCandidateSchema.safeParse(inputData);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid review payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { candidateId, status, customName, customDescription, customDifficulty } = parseResult.data;

    // Fetch candidate to verify course ownership
    const candRes = await conceptCandidateService.getCandidateById(candidateId);
    if (!candRes.success) {
      return NextResponse.json({ error: candRes.error }, { status: 500 });
    }
    if (!candRes.data) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candRes.data;

    // Verify requesting user is course teacher
    if (userId) {
      const authResult = await verifyTeacherAuth(userId);
      if (!authResult.authorized) {
        return NextResponse.json(
          { error: authResult.error || 'Forbidden: Requires teacher privileges' },
          { status: authResult.statusCode || 403 }
        );
      }

      const courseRes = await courseService.getCourseById(candidate.courseId);
      if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this course' },
          { status: 403 }
        );
      }
    }

    const reviewRes = await conceptCandidateService.reviewCandidate(
      {
        candidateId,
        status,
        customName,
        customDescription,
        customDifficulty,
      },
      userId || 'teacher'
    );

    if (!reviewRes.success) {
      return NextResponse.json(
        { error: reviewRes.error },
        { status: 500 }
      );
    }
    if (!reviewRes.data) {
      return NextResponse.json(
        { error: 'Failed to process candidate review' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      candidate: reviewRes.data.candidate,
      concept: reviewRes.data.concept,
    });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/candidates/review] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while reviewing candidate' },
      { status: 500 }
    );
  }
}
