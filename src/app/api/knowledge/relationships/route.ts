import { NextRequest, NextResponse } from 'next/server';
import { createConceptRelationshipSchema } from '@/lib/validation';
import { relationshipService } from '@/services/knowledge/relationshipService';
import { courseService } from '@/services/courses/courseService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...inputData } = body;

    const parseResult = createConceptRelationshipSchema.safeParse(inputData);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid relationship payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { courseId, sourceConceptId, targetConceptId, type, description } = parseResult.data;

    // Verify teacher ownership of the course
    if (userId) {
      const courseRes = await courseService.getCourseById(courseId);
      if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this course' },
          { status: 403 }
        );
      }
    }

    const relRes = await relationshipService.createRelationship({
      courseId,
      sourceConceptId,
      targetConceptId,
      type,
      description,
    });

    if (!relRes.success) {
      return NextResponse.json(
        { error: relRes.error },
        { status: 400 }
      );
    }
    if (!relRes.data) {
      return NextResponse.json(
        { error: 'Failed to create concept relationship' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      relationship: relRes.data,
    });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/relationships] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while creating relationship' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const relationshipId = searchParams.get('id');

    if (!relationshipId) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const delRes = await relationshipService.deleteRelationship(relationshipId);
    if (!delRes.success) {
      return NextResponse.json(
        { error: delRes.error || 'Failed to delete relationship' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/relationships DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while deleting relationship' },
      { status: 500 }
    );
  }
}
