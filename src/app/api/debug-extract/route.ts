import { NextRequest, NextResponse } from 'next/server';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function GET(req: NextRequest) {
  try {
    const courseId = 'zm4Y1YVNzFvTvjihJKjA';
    const conceptsSnap = await getDocs(query(collection(db, 'concepts'), where('courseId', '==', courseId)));
    const concepts = conceptsSnap.docs.map(d => ({id: d.id, ...d.data()}));

    return NextResponse.json({ concepts });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
