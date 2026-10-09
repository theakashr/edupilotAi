import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import {
  STORAGE_BUCKET,
  MAX_FILE_SIZE_BYTES,
  validateEducationalFile,
} from '@/lib/supabase/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes for large textbook uploads

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const storagePath = formData.get('storagePath') as string | null;
    const contentType = formData.get('contentType') as string | null;

    if (!file || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required file or storagePath' },
        { status: 400 }
      );
    }

    // 1. Validate file size and type
    const validation = validateEducationalFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum 50 MB limit.' },
        { status: 400 }
      );
    }

    // 2. Convert File to ArrayBuffer for Supabase Storage
    const buffer = await file.arrayBuffer();

    // 3. Upload to private Supabase storage bucket via privileged server client
    const { data, error } = await supabaseServer.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: contentType || file.type,
        upsert: true,
      });

    if (error) {
      return NextResponse.json(
        { error: `Supabase upload error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      storagePath: data.path,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server upload error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
