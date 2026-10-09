import { NextRequest, NextResponse } from 'next/server';
import { courseReadinessService } from '@/services/courses/courseReadinessService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const studentId = req.nextUrl.searchParams.get('studentId') || '';
    
    // Check auth header if studentId isn't provided (for teacher view)
    const userId = studentId || req.headers.get('x-user-id')?.trim() || '';

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const readiness = await courseReadinessService.getCourseReadiness(courseId, userId);
    
    return NextResponse.json({
      success: true,
      data: readiness
    });
  } catch (err: unknown) {
    console.error('[API /api/courses/[courseId]/readiness] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while computing readiness' },
      { status: 500 }
    );
  }
}
