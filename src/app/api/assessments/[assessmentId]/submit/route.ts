/**
 * src/app/api/assessments/[assessmentId]/submit/route.ts
 *
 * Secure server-side grading & submission endpoint.
 *
 * Core Guarantees:
 * - Deterministic server-side grading against authoritative assessment definition.
 * - Client-supplied scores are completely ignored.
 * - Prevents duplicate submissions.
 * - Evaluates concept-level performance (demonstrated understanding vs. potential difficulty).
 * - Records attempt in assessment_attempts collection.
 * - Logs student activity & updates learning profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { assessmentService } from '@/services/assessments/assessmentService';
import { courseService } from '@/services/courses/courseService';
import { learningService } from '@/services/learning/learningService';
import { replanningService } from '@/services/learning/replanningService';
import { getUserProfile } from '@/lib/firebase/firestore';
import { submitAssessmentSchema } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const userId =
      req.headers.get('x-user-id')?.trim() || body.userId?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    // 1. Validate submission format
    const parsed = submitAssessmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid submission data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { answers } = parsed.data;

    // 2. Fetch User Profile & Authoritative Assessment
    const [profile, assRes] = await Promise.all([
      getUserProfile(userId),
      assessmentService.getAssessmentById(assessmentId),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized: Student profile not found.' },
        { status: 401 }
      );
    }

    if (!assRes.success || !assRes.data) {
      return NextResponse.json(
        { error: 'Assessment not found.' },
        { status: 404 }
      );
    }

    const assessment = assRes.data;

    // 3. Status Check: Assessment must be published
    if (assessment.status !== 'published') {
      return NextResponse.json(
        { error: 'Forbidden: Cannot submit to an unpublished assessment.' },
        { status: 403 }
      );
    }

    // 4. Verify Course Enrollment
    const membersRes = await courseService.listCourseMembers(assessment.courseId);
    const isEnrolled =
      membersRes.success &&
      membersRes.data?.some(
        (m) =>
          m.studentId === userId ||
          (profile.studentId && m.studentId === profile.studentId)
      );

    if (!isEnrolled) {
      return NextResponse.json(
        { error: 'Forbidden: You are not enrolled in this course.' },
        { status: 403 }
      );
    }

    // 5. Prevent Duplicate Submissions
    const existingAttemptsRes = await assessmentService.listStudentAttempts(
      assessmentId,
      userId
    );

    if (existingAttemptsRes.success && existingAttemptsRes.data) {
      const alreadyCompleted = existingAttemptsRes.data.find(
        (a) => a.status === 'completed'
      );
      if (alreadyCompleted) {
        return NextResponse.json(
          {
            error: 'Duplicate Submission: You have already completed this assessment.',
            attempt: alreadyCompleted,
          },
          { status: 409 }
        );
      }
    }

    // 6. Deterministic Server-Side Grading
    const graded = assessmentService.gradeAssessmentSubmission(assessment, answers);

    // 7. Persist Attempt to Firestore
    const startRes = await assessmentService.startAssessmentAttempt({
      assessmentId,
      courseId: assessment.courseId,
      studentId: userId,
      studentName: profile.displayName || profile.email.split('@')[0],
      studentEmail: profile.email,
      status: 'in_progress',
    });

    if (!startRes.success || !startRes.data) {
      return NextResponse.json(
        { error: 'Failed to create assessment attempt record.' },
        { status: 500 }
      );
    }

    const attemptId = startRes.data.id;

    const completeRes = await assessmentService.completeAssessmentAttempt(
      attemptId,
      {
        score: graded.score,
        totalMarks: graded.totalMarks,
        percentage: graded.percentage,
        status: 'completed',
        answers,
        results: graded.results,
        conceptBreakdown: graded.conceptBreakdown,
      }
    );

    if (!completeRes.success) {
      return NextResponse.json(
        { error: 'Failed to record completed attempt.' },
        { status: 500 }
      );
    }

    // 8. Update Genuine Learning Profile & Activity Log
    try {
      if (assessment.type === 'diagnostic') {
        await learningService.upsertLearningProfile(userId, assessment.courseId, {
          overallMastery: graded.percentage,
        });
      }

      await learningService.logStudentActivity({
        studentId: userId,
        courseId: assessment.courseId,
        activityType: 'quiz_completed',
        referenceId: assessmentId,
        metadata: {
          assessmentTitle: assessment.title,
          type: assessment.type,
          score: graded.score,
          totalMarks: graded.totalMarks,
          percentage: graded.percentage,
        },
      });

      // Phase 10: Trigger Adaptive Dynamic Replanning
      await replanningService.replanStudentCourse({
        studentId: userId,
        courseId: assessment.courseId,
        triggerReason: `Completed assessment '${assessment.title}' (Score: ${graded.percentage}%)`,
      });
    } catch (logErr) {
      console.warn('Non-fatal error logging activity, learning profile, or replanning:', logErr);
    }

    // 9. Return Detailed Graded Response
    return NextResponse.json({
      success: true,
      attemptId,
      score: graded.score,
      totalMarks: graded.totalMarks,
      percentage: graded.percentage,
      results: graded.results,
      conceptBreakdown: graded.conceptBreakdown,
    });
  } catch (err: unknown) {
    console.error('Error in POST /api/assessments/[id]/submit:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
