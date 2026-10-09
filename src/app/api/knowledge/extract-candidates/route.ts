import { NextRequest, NextResponse } from 'next/server';
import { courseService } from '@/services/courses/courseService';
import { materialService } from '@/services/materials/materialService';
import { conceptCandidateService } from '@/services/knowledge/conceptCandidateService';
import type { MaterialChunk } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId, materialId, userId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // 1. Verify course and ownership
    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success) {
      return NextResponse.json({ error: courseRes.error }, { status: 500 });
    }
    if (!courseRes.data) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseRes.data;
    if (userId && course.teacherId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Only the course teacher can extract concept candidates' },
        { status: 403 }
      );
    }

    // 2. Collect chunks from the specified material or all ready materials in the course
    let targetChunks: MaterialChunk[] = [];
    let primaryMaterialId = materialId;

    if (materialId) {
      const chunksRes = await materialService.listMaterialChunks(materialId);
      if (!chunksRes.success) {
        return NextResponse.json(
          { error: chunksRes.error },
          { status: 500 }
        );
      }
      if (!chunksRes.data) {
        return NextResponse.json(
          { error: 'Failed to retrieve chunks for material' },
          { status: 404 }
        );
      }
      targetChunks = chunksRes.data;
    } else {
      // Extract from all materials in the course
      const matsRes = await materialService.listCourseMaterials(courseId);
      if (!matsRes.success || !matsRes.data || matsRes.data.length === 0) {
        return NextResponse.json(
          { error: 'No materials found for this course to extract concepts from' },
          { status: 400 }
        );
      }

      const readyMats = matsRes.data.filter((m) => m.status === 'ready');
      if (readyMats.length === 0) {
        return NextResponse.json(
          { error: 'No ready materials available. Please process PDF documents first.' },
          { status: 400 }
        );
      }

      primaryMaterialId = readyMats[0].id;
      for (const mat of readyMats) {
        const cRes = await materialService.listMaterialChunks(mat.id);
        if (cRes.success && cRes.data) {
          targetChunks.push(...cRes.data);
        }
      }
    }

    if (targetChunks.length === 0) {
      return NextResponse.json(
        { error: 'No chunks found to extract candidates from. Ensure documents are processed.' },
        { status: 400 }
      );
    }

    // 3. Deterministic candidate extraction & Firestore queuing
    const extractRes = await conceptCandidateService.extractAndSaveCandidates(
      courseId,
      primaryMaterialId,
      targetChunks
    );

    if (!extractRes.success) {
      return NextResponse.json(
        { error: extractRes.error },
        { status: 500 }
      );
    }
    if (!extractRes.data) {
      return NextResponse.json(
        { error: 'Failed to extract concept candidates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      totalExtracted: extractRes.data.totalExtracted,
      newSaved: extractRes.data.newSaved,
      candidates: extractRes.data.candidates,
    });
  } catch (err: unknown) {
    console.error('[API /api/knowledge/extract-candidates] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while extracting concept candidates' },
      { status: 500 }
    );
  }
}
