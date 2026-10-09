/**
 * src/app/api/admin/provision-teacher/route.ts
 *
 * Secure server-side administrative endpoint for provisioning and revoking teacher roles.
 * Protected by ADMIN_PROVISIONING_SECRET.
 *
 * Actions:
 * - provision:      Grant 'teacher' role to a user (by email or UID).
 * - revoke:         Revoke teacher access ('deactivate' or 'demote' to student).
 * - status:         Inspect profile and role status for a user.
 * - list:           List all registered teachers.
 * - create-invite:  Generate a secure invitation token for institutional onboarding.
 * - claim-invite:   Redeem a valid invitation token to activate teacher privileges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSecret } from '@/lib/auth/serverAuth';
import {
  provisionTeacher,
  revokeTeacherAccess,
  listAllTeachers,
  getTeacherStatus,
  createTeacherInvitation,
  claimTeacherInvitation,
} from '@/lib/firebase/adminProvisioning';

// ─── GET: List teachers or inspect status ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = verifyAdminSecret(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get('email') || searchParams.get('uid');

  if (identifier) {
    const status = await getTeacherStatus(identifier);
    if (!status) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, profile: status });
  }

  const teachers = await listAllTeachers();
  return NextResponse.json({
    success: true,
    count: teachers.length,
    teachers,
  });
}

// ─── POST: Administrative Actions ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = verifyAdminSecret(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const action = (body.action as string)?.toLowerCase();

  switch (action) {
    case 'provision': {
      const email = body.email as string;
      const displayName = body.displayName as string | undefined;
      const uid = body.uid as string | undefined;
      const password = body.password as string | undefined;

      const result = await provisionTeacher({ email, displayName, uid, password });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    case 'revoke': {
      const email = body.email as string | undefined;
      const uid = body.uid as string | undefined;
      const mode = (body.mode as 'deactivate' | 'demote') || 'demote';

      const result = await revokeTeacherAccess({ email, uid, mode });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    case 'status': {
      const identifier = (body.email as string) || (body.uid as string);
      if (!identifier) {
        return NextResponse.json({ error: 'Email or UID is required.' }, { status: 400 });
      }
      const profile = await getTeacherStatus(identifier);
      if (!profile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, profile });
    }

    case 'list': {
      const teachers = await listAllTeachers();
      return NextResponse.json({ success: true, count: teachers.length, teachers });
    }

    case 'create-invite': {
      const email = body.email as string;
      const name = body.name as string | undefined;
      const expiresInHours = (body.expiresInHours as number) || 72;

      const result = await createTeacherInvitation(email, name, expiresInHours);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    case 'claim-invite': {
      const token = body.token as string;
      const uid = body.uid as string;
      const email = body.email as string;

      const result = await claimTeacherInvitation(token, uid, email);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    default: {
      return NextResponse.json(
        {
          error: `Unknown action: '${action}'. Supported actions: provision, revoke, status, list, create-invite, claim-invite.`,
        },
        { status: 400 }
      );
    }
  }
}
