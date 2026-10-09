/**
 * src/app/api/learning/plan/route.ts
 *
 * GET /api/learning/plan?courseId=...
 *
 * Retrieves the authenticated student's personalized adaptive learning plan,
 * concept mastery estimates, and identified learning gaps.
 * If no plan exists yet, runs an initial replan on the fly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { courseService } from '@/services/courses/courseService';
import { getUserProfile } from '@/lib/firebase/firestore';
import { replanningService } from '@/services/learning/replanningService';

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId');
    const targetStudentId = req.nextUrl.searchParams.get('studentId');

    const authUserId = req.headers.get('x-user-id');
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'courseId query parameter is required' }, { status: 400 });
    }

    const callerProfile = await getUserProfile(authUserId);
    if (!callerProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Determine target student
    let studentId = authUserId;
    if (callerProfile.role === 'teacher') {
      // Teacher can inspect a specific student's plan if requested
      if (targetStudentId) {
        studentId = targetStudentId;
      }
      // Verify teacher course ownership
      const courseRes = await courseService.getCourseById(courseId);
      if (!courseRes.success || !courseRes.data) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      if (courseRes.data.teacherId !== authUserId) {
        return NextResponse.json({ error: 'Forbidden: You do not teach this course' }, { status: 403 });
      }
    } else {
      // Student can only access their own plan
      studentId = authUserId;

      // Verify enrollment
      const membersRes = await courseService.listCourseMembers(courseId);
      const isEnrolled =
        membersRes.success &&
        membersRes.data?.some(
          (m) =>
            m.studentId === authUserId ||
            (callerProfile.studentId && m.studentId === callerProfile.studentId)
        );

      if (!isEnrolled) {
        return NextResponse.json({ error: 'Forbidden: You are not enrolled in this course' }, { status: 403 });
      }
    }

    // Retrieve or dynamically generate plan
    const planRes = await replanningService.replanStudentCourse({
      studentId,
      courseId,
      triggerReason: 'User fetched adaptive learning plan',
    });

    if (!planRes.success) {
      return NextResponse.json({ error: planRes.error || 'Failed to generate learning plan' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: planRes.data,
    });
  } catch (err: unknown) {
    console.error('Error in GET /api/learning/plan:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
