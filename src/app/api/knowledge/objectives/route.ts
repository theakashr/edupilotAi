import { NextRequest, NextResponse } from 'next/server';
import { createLearningObjectiveSchema, updateLearningObjectiveSchema } from '@/lib/validation';
import { learningObjectiveService } from '@/services/knowledge/learningObjectiveService';
import { courseService } from '@/services/courses/courseService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...inputData } = body;

    const parseResult = createLearningObjectiveSchema.safeParse(inputData);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid learning objective payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { courseId, title, description, conceptIds, materialIds } = parseResult.data;

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

    const objRes = await learningObjectiveService.createObjective({
      courseId,
      title,
      description,
      conceptIds,
      materialIds,
    });

    if (!objRes.success) {
      return NextResponse.json(
        { error: objRes.error },
        { status: 400 }
      );
    }
    if (!objRes.data) {
      return NextResponse.json(
        { error: 'Failed to create learning objective' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      objective: objRes.data,
    });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/objectives POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while creating learning objective' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const parseResult = updateLearningObjectiveSchema.safeParse(updates);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await learningObjectiveService.getObjectiveById(id);
    if (!existing.success || !existing.data) {
      return NextResponse.json({ error: 'Learning objective not found' }, { status: 404 });
    }

    if (userId) {
      const courseRes = await courseService.getCourseById(existing.data.courseId);
      if (courseRes.success && courseRes.data && courseRes.data.teacherId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updateRes = await learningObjectiveService.updateObjective(id, parseResult.data);
    if (!updateRes.success) {
      return NextResponse.json(
        { error: updateRes.error || 'Failed to update learning objective' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/objectives PUT] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while updating learning objective' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const objectiveId = searchParams.get('id');

    if (!objectiveId) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const delRes = await learningObjectiveService.deleteObjective(objectiveId);
    if (!delRes.success) {
      return NextResponse.json(
        { error: delRes.error || 'Failed to delete learning objective' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/objectives DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while deleting learning objective' },
      { status: 500 }
    );
  }
}
