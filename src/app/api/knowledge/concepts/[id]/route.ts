import { NextRequest, NextResponse } from 'next/server';
import { conceptService } from '@/services/knowledge/conceptService';
import { courseService } from '@/services/courses/courseService';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conceptId } = await context.params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const force = searchParams.get('force') === 'true';

    // 1. Fetch concept
    const conceptRes = await conceptService.getConceptById(conceptId);
    if (!conceptRes.success) {
      return NextResponse.json({ error: conceptRes.error }, { status: 500 });
    }
    if (!conceptRes.data) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    const concept = conceptRes.data;

    // 2. Verify ownership
    if (userId) {
      const courseRes = await courseService.getCourseById(concept.courseId);
      if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 3. Safe delete or archive
    const delRes = await conceptService.safeDeleteOrArchiveConcept(
      conceptId,
      concept.courseId,
      force
    );

    if (!delRes.success) {
      return NextResponse.json(
        { error: delRes.error },
        { status: 500 }
      );
    }
    if (!delRes.data) {
      return NextResponse.json(
        { error: 'Failed to remove concept' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      actionTaken: delRes.data.actionTaken,
      dependencies: delRes.data.dependencies,
    });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/concepts/[id] DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while deleting concept' },
      { status: 500 }
    );
  }
}
