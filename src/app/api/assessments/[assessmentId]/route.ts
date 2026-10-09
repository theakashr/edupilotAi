/**
 * src/app/api/assessments/[assessmentId]/route.ts
 *
 * Secure server-side endpoint for retrieving, updating, and deleting assessments.
 *
 * Security & Data Privacy Guarantees:
 * - Teachers (course owners): Receive full assessment with questions, correct answers, and explanations.
 * - Students (enrolled only): Receive sanitized assessment WITHOUT correctOptionIndex or explanation.
 * - Students: Cannot access draft or closed assessments.
 * - Unenrolled students & unauthenticated callers: Rejected with 401/403.
 */

import { NextRequest, NextResponse } from 'next/server';
import { assessmentService } from '@/services/assessments/assessmentService';
import { courseService } from '@/services/courses/courseService';
import { getUserProfile } from '@/lib/firebase/firestore';
import { updateAssessmentSchema } from '@/lib/validation';
import type { SanitizedQuestion } from '@/types';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await context.params;
    const userId =
      req.headers.get('x-user-id')?.trim() ||
      req.nextUrl.searchParams.get('userId')?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const [profile, assRes] = await Promise.all([
      getUserProfile(userId),
      assessmentService.getAssessmentById(assessmentId),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized: User profile not found.' },
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
    const courseRes = await courseService.getCourseById(assessment.courseId);
    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json(
        { error: 'Course not found.' },
        { status: 404 }
      );
    }

    const course = courseRes.data;
    const isTeacher =
      profile.role === 'teacher' && course.teacherId === userId;
    const isAdmin = (profile as unknown as { role: string }).role === 'admin';

    // ─── Teacher / Admin Access: Full details including answer key ───────────
    if (isTeacher || isAdmin) {
      return NextResponse.json({
        success: true,
        data: assessment,
        isTeacher: true,
      });
    }

    // ─── Student Access: Verify enrollment & sanitize answers ────────────────
    if (profile.role === 'student') {
      // 1. Must be published
      if (assessment.status !== 'published') {
        return NextResponse.json(
          { error: 'Forbidden: Draft assessments are not accessible to students.' },
          { status: 403 }
        );
      }

      // 2. Verify course enrollment
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

      // 3. Check for previous completed attempts
      const attemptsRes = await assessmentService.listStudentAttempts(
        assessmentId,
        userId
      );
      const completedAttempt = attemptsRes.success
        ? attemptsRes.data?.find((a) => a.status === 'completed')
        : null;

      // 4. Sanitize questions: strip correctOptionIndex and explanation
      const sanitizedQuestions: SanitizedQuestion[] = (
        assessment.questions || []
      ).map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        conceptId: q.conceptId,
        conceptName: q.conceptName,
        points: q.points || 1,
      }));

      const sanitizedAssessment = {
        ...assessment,
        questions: sanitizedQuestions,
      };

      return NextResponse.json({
        success: true,
        data: sanitizedAssessment,
        isTeacher: false,
        completedAttempt: completedAttempt || null,
      });
    }

    return NextResponse.json(
      { error: 'Forbidden: Access denied.' },
      { status: 403 }
    );
  } catch (err: unknown) {
    console.error('Error in GET /api/assessments/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const [profile, assRes] = await Promise.all([
      getUserProfile(userId),
      assessmentService.getAssessmentById(assessmentId),
    ]);

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can update assessments.' },
        { status: 403 }
      );
    }

    if (!assRes.success || !assRes.data) {
      return NextResponse.json(
        { error: 'Assessment not found.' },
        { status: 404 }
      );
    }

    const assessment = assRes.data;
    const courseRes = await courseService.getCourseById(assessment.courseId);
    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (courseRes.data.teacherId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this course.' },
        { status: 403 }
      );
    }

    const parsed = updateAssessmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updateRes = await assessmentService.updateAssessment(
      assessmentId,
      parsed.data
    );

    if (!updateRes.success) {
      return NextResponse.json(
        { error: updateRes.error || 'Failed to update assessment.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Assessment updated successfully.' });
  } catch (err: unknown) {
    console.error('Error in PUT /api/assessments/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await context.params;
    const userId = req.headers.get('x-user-id')?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const [profile, assRes] = await Promise.all([
      getUserProfile(userId),
      assessmentService.getAssessmentById(assessmentId),
    ]);

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can delete assessments.' },
        { status: 403 }
      );
    }

    if (!assRes.success || !assRes.data) {
      return NextResponse.json(
        { error: 'Assessment not found.' },
        { status: 404 }
      );
    }

    const assessment = assRes.data;
    const courseRes = await courseService.getCourseById(assessment.courseId);
    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (courseRes.data.teacherId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this course.' },
        { status: 403 }
      );
    }

    const deleteRes = await assessmentService.deleteAssessment(assessmentId);
    if (!deleteRes.success) {
      return NextResponse.json(
        { error: deleteRes.error || 'Failed to delete assessment.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Assessment deleted successfully.' });
  } catch (err: unknown) {
    console.error('Error in DELETE /api/assessments/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
