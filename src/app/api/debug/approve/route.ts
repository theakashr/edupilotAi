import { NextRequest, NextResponse } from 'next/server';
import { conceptCandidateService } from '@/services/knowledge/conceptCandidateService';

export async function GET(req: NextRequest) {
  try {
    const courseId = '0t2Xfthm8ErbEEmB7pcS';
    const candsRes = await conceptCandidateService.listCourseCandidates(courseId);
    
    if (!candsRes.success || !candsRes.data) {
      return NextResponse.json({ error: (candsRes as any).error || 'Failed to fetch' }, { status: 500 });
    }

    const approved = [];
    for (const cand of candsRes.data) {
      if (cand.status === 'pending') {
        const reviewRes = await conceptCandidateService.reviewCandidate({
          candidateId: cand.id,
          status: 'approved'
        }, 'system');
        approved.push({ id: cand.id, success: reviewRes.success });
      }
    }

    return NextResponse.json({ success: true, approved });
  } catch (err: unknown) {
    console.error('[API /api/debug/approve] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error while approving' },
      { status: 500 }
    );
  }
}
