import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/services/documents/documentProcessor';
import { materialService } from '@/services/materials/materialService';
import { courseService } from '@/services/courses/courseService';
import { verifyTeacherAuth } from '@/lib/auth/serverAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { materialId, userId } = body;

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId is required' },
        { status: 400 }
      );
    }

    // 1. Fetch material record from Firestore
    const matRes = await materialService.getMaterialById(materialId);
    if (!matRes.success || !matRes.data) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    const material = matRes.data;

    // 2. Fetch associated course and verify teacher ownership
    const courseRes = await courseService.getCourseById(material.courseId);
    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json(
        { error: 'Associated course not found' },
        { status: 404 }
      );
    }

    const course = courseRes.data;

    // Check teacher identity if provided
    if (userId) {
      const authResult = await verifyTeacherAuth(userId);
      if (!authResult.authorized) {
        return NextResponse.json(
          { error: authResult.error || 'Forbidden: Requires teacher privileges' },
          { status: authResult.statusCode || 403 }
        );
      }

      if (course.teacherId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to process materials for this course' },
          { status: 403 }
        );
      }
    }

    const requestingUserId = userId || course.teacherId;

    // 3. Execute document ingestion and text extraction pipeline
    const result = await processDocument({
      materialId,
      requestingUserId,
      bypassOwnershipCheck: !userId, // If validated above, bypass internal duplicate check
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to process document',
          status: result.status,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      materialId: result.materialId,
      status: result.status,
      pageCount: result.pageCount,
      chunkCount: result.chunkCount,
    });
  } catch (err: unknown) {
    console.error('[API /api/materials/process] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while processing document' },
      { status: 500 }
    );
  }
}
