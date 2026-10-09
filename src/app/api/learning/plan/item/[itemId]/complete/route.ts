/**
 * src/app/api/learning/plan/item/[itemId]/complete/route.ts
 *
 * POST /api/learning/plan/item/[itemId]/complete
 *
 * Marks an individual learning path item as completed and logs behavioral signal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/services/learning/learningService';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const authUserId = req.headers.get('x-user-id');
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const { itemId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { courseId } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // Update status to completed
    const updateRes = await learningService.updateLearningPathItem(itemId, {
      status: 'completed',
    });

    if (!updateRes.success) {
      return NextResponse.json({ error: updateRes.error || 'Failed to update item' }, { status: 500 });
    }

    // Log student activity if courseId is available
    if (courseId) {
      await learningService.logStudentActivity({
        studentId: authUserId,
        courseId,
        activityType: 'lesson_completed',
        referenceId: itemId,
        metadata: {
          pathItemId: itemId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error in POST /api/learning/plan/item/[itemId]/complete:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
