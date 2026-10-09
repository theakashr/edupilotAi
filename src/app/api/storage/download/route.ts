import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { STORAGE_BUCKET } from '@/lib/supabase/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storagePath = searchParams.get('storagePath');
    const expiresIn = parseInt(searchParams.get('expiresIn') || '60', 10);

    if (!storagePath) {
      return NextResponse.json(
        { error: 'storagePath parameter is required' },
        { status: 400 }
      );
    }

    // Generate a temporary signed URL from private Supabase bucket
    const { data, error } = await supabaseServer.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server download error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
