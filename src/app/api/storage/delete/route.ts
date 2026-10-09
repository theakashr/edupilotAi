import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { STORAGE_BUCKET } from '@/lib/supabase/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storagePath } = body;

    if (!storagePath) {
      return NextResponse.json(
        { error: 'storagePath is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      return NextResponse.json(
        { error: `Supabase delete error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server delete error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
