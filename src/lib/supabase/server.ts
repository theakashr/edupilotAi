import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://ldgvmpuwtynmgisqvpbe.supabase.co';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'placeholder_service_role_key';

/**
 * Server-only privileged Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY for administrative bucket and file operations.
 * NEVER import this file into client components ('use client').
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
