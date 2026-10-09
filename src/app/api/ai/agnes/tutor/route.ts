import { NextRequest, NextResponse } from 'next/server';
import { agnesService } from '@/services/ai/agnesService';
import { conceptService } from '@/services/knowledge/conceptService';
import { materialService } from '@/services/materials/materialService';
import { courseService } from '@/services/courses/courseService';
import { getUserProfile } from '@/lib/firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { courseId, conceptId, question } = body;
    
    const userId = req.headers.get('x-user-id')?.trim() || body.userId?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    if (!courseId || !conceptId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // 1. Verify User Profile & Enrollment
    const profile = await getUserProfile(userId);
    const coursesRes = await courseService.listStudentCourses(userId, profile?.studentId);
    if (!coursesRes.success || !coursesRes.data || !coursesRes.data.some(c => c.id === courseId)) {
      return NextResponse.json({ error: 'Forbidden: You are not enrolled in this course.' }, { status: 403 });
    }

    // 2. Verify Concept belongs to course and is approved
    const conceptRes = await conceptService.getConceptById(conceptId);
    if (!conceptRes.success || !conceptRes.data) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    const concept = conceptRes.data;
    if (concept.courseId !== courseId) {
      return NextResponse.json({ error: 'Concept does not belong to this course.' }, { status: 403 });
    }

    // 3. Load materials and chunks to ground the prompt
    const matsRes = await materialService.listCourseMaterials(courseId);
    const materials = matsRes.success && matsRes.data ? matsRes.data.filter(m => m.status === 'ready') : [];
    
    let selectedChunks: any[] = [];
    if (concept.materialIds && concept.materialIds.length > 0) {
       for (const matId of concept.materialIds) {
           const cRes = await materialService.listMaterialChunks(matId);
           if (cRes.success && cRes.data) {
               selectedChunks.push(...cRes.data);
           }
       }
    } else {
        // Fallback: load chunks from the first ready material
        if (materials.length > 0) {
            const cRes = await materialService.listMaterialChunks(materials[0].id);
            if (cRes.success && cRes.data) {
                selectedChunks = cRes.data.slice(0, 10);
            }
        }
    }

    const titles = materials.reduce((acc, m) => {
        acc[m.id] = m.title;
        return acc;
    }, {} as Record<string, string>);

    // 4. Call Agnes Service
    const res = await agnesService.explainConceptFromSources({
        courseId,
        concept,
        selectedChunks,
        question,
        userId,
        materialTitles: titles
    });

    if (!res.success) {
        return NextResponse.json({ error: res.error, detail: 'debug' }, { status: 500 });
    }

    return NextResponse.json({ 
        success: true, 
        data: {
            summary: res.data.conceptName,
            explanation: res.data.explanation,
            keyTakeaways: res.data.keyPoints,
            sourceReferences: res.data.sourceReferences,
        }
    });
  } catch (err: unknown) {
    console.error('[API /api/ai/agnes/tutor] Error:', err);
    return NextResponse.json({ error: 'Internal server error while fetching AI explanation' }, { status: 500 });
  }
}
