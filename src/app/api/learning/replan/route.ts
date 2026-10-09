/**
 * src/app/api/learning/replan/route.ts
 *
 * POST /api/learning/replan
 *
 * Triggers on-demand replanning for a student in a course.
 */

import { NextRequest, NextResponse } from 'next/server';
import { courseService } from '@/services/courses/courseService';
import { getUserProfile } from '@/lib/firebase/firestore';
import { replanningService } from '@/services/learning/replanningService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { courseId, studentId: requestedStudentId } = body;

    const authUserId =
      req.headers.get('x-user-id')?.trim() ||
      req.nextUrl.searchParams.get('userId')?.trim() ||
      body.userId?.trim();

    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const callerProfile = await getUserProfile(authUserId);
    if (!callerProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    let targetStudentId = authUserId;
    if (callerProfile.role === 'teacher') {
      if (requestedStudentId) {
        targetStudentId = requestedStudentId;
      }
      const courseRes = await courseService.getCourseById(courseId);
      if (!courseRes.success || !courseRes.data) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      if (courseRes.data.teacherId !== authUserId) {
        return NextResponse.json({ error: 'Forbidden: You do not teach this course' }, { status: 403 });
      }
    } else {
      targetStudentId = authUserId;
    }

    const planRes = await replanningService.replanStudentCourse({
      studentId: targetStudentId,
      courseId,
      triggerReason: 'Manual on-demand replan requested',
    });

    if (!planRes.success) {
      return NextResponse.json({ error: planRes.error || 'Failed to replan' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: planRes.data,
    });
  } catch (err: unknown) {
    console.error('Error in POST /api/learning/replan:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
