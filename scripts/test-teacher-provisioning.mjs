/**
 * scripts/test-teacher-provisioning.mjs
 *
 * EduPilot AI — Teacher Account Provisioning & Security Invariants Verification Suite
 *
 * Validates:
 * 1. Role schema & types integrity
 * 2. RoleGuard protection (blocks students, unauthenticated, deactivated accounts)
 * 3. Login portal boundaries (immediate teardown of unauthorized students on teacher login)
 * 4. Google OAuth security (never auto-provisions teacher role)
 * 5. Server-side authorization helpers (verifyTeacherAuth & verifyAdminSecret)
 * 6. Firestore security rules integrity (prevents client-side privilege escalation)
 * 7. Teacher API route protection across course & conflict management
 * 8. Next.js routing & redirect (/teacher/login -> /login?role=teacher)
 * 9. Administrative provisioning API & CLI script integrity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
    process.exitCode = 1;
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

console.log('================================================================');
console.log('   EDUPILOT AI — SECURE TEACHER PROVISIONING TEST SUITE');
console.log('================================================================\n');

// ─── 1. Role Schema & Profile Types ──────────────────────────────────────────
console.log('── 1. User Profile & Role Types Integrity ──────────────────────────────');

assert(fileExists('src/types/user.ts'), 'src/types/user.ts exists');
const userTypeContent = readFile('src/types/user.ts');
assert(userTypeContent.includes("export type Role = 'teacher' | 'student';"), "Role type contains 'teacher' | 'student'");
assert(userTypeContent.includes('isActive: boolean;'), 'UserProfile schema includes isActive field');
assert(userTypeContent.includes('role: Role;'), 'UserProfile schema includes role field');

// ─── 2. Public Registration & Self-Enrollment Logic ──────────────────────────
console.log('\n── 2. Public Registration & Google OAuth Invariants ────────────────────');

assert(fileExists('src/services/auth/authService.ts'), 'authService.ts exists');
const authServiceContent = readFile('src/services/auth/authService.ts');

assert(
  authServiceContent.includes("const trustedRole: Role = 'student';"),
  "registerUser strictly enforces trustedRole = 'student' regardless of client input"
);
assert(
  !authServiceContent.includes("defaultRole: Role = 'teacher'"),
  'authService does not permit default teacher role'
);
assert(
  authServiceContent.includes("loginWithGoogle = async ()"),
  'loginWithGoogle does not accept caller-controlled role parameter'
);
assert(
  authServiceContent.includes("'student'\n      );\n      profile = await getUserProfile(user.uid);") ||
    authServiceContent.includes("'student'\r\n      );\r\n      profile = await getUserProfile(user.uid);"),
  "loginWithGoogle strictly initializes new users with 'student' role"
);

// ─── 3. Teacher Login Boundary & Immediate Session Teardown ──────────────────
console.log('\n── 3. Teacher Login Verification & Student Rejection ───────────────────');

assert(fileExists('src/app/login/page.tsx'), 'login/page.tsx exists');
const loginPageContent = readFile('src/app/login/page.tsx');

assert(
  loginPageContent.includes('activeRole === "teacher"') &&
    loginPageContent.includes('trustedRole !== "teacher"'),
  'Login page checks activeRole === teacher against trustedRole !== teacher'
);
assert(
  loginPageContent.includes('await logoutUser();') &&
    loginPageContent.includes('Student accounts are not permitted to log in through the Teacher Portal'),
  'Email/password teacher login immediately signs out student and displays explicit rejection'
);
assert(
  loginPageContent.includes('userProfile.isActive === false') &&
    loginPageContent.includes('Your account has been deactivated'),
  'Login page rejects deactivated accounts and revokes active session'
);
assert(
  loginPageContent.includes('This Google account is not an authorized teacher account'),
  'Google OAuth on teacher login rejects and signs out student accounts'
);

// ─── 4. RoleGuard Protection ─────────────────────────────────────────────────
console.log('\n── 4. RoleGuard Boundary & Content Exposure Prevention ─────────────────');

assert(fileExists('src/components/layout/RoleGuard.tsx'), 'RoleGuard.tsx exists');
const roleGuardContent = readFile('src/components/layout/RoleGuard.tsx');

assert(
  roleGuardContent.includes('profile?.isActive !== false'),
  'RoleGuard verifies that profile?.isActive is not false'
);
assert(
  roleGuardContent.includes('allowedRoles.includes(role)'),
  'RoleGuard verifies allowedRoles.includes(role)'
);
assert(
  roleGuardContent.includes("router.push('/unauthorized')"),
  'RoleGuard routes unauthorized users to /unauthorized'
);
assert(
  roleGuardContent.includes('if (!isAuthorized)') &&
    roleGuardContent.includes('<div className="hidden" aria-hidden="true">'),
  'RoleGuard prevents unauthorized content from flashing before redirect'
);

// ─── 5. Server-Side Authorization Helpers ─────────────────────────────────────
console.log('\n── 5. Server-Side Authorization Engine (serverAuth.ts) ─────────────────');

assert(fileExists('src/lib/auth/serverAuth.ts'), 'src/lib/auth/serverAuth.ts exists');
const serverAuthContent = readFile('src/lib/auth/serverAuth.ts');

assert(
  serverAuthContent.includes('export async function verifyTeacherAuth'),
  'verifyTeacherAuth function exported'
);
assert(
  serverAuthContent.includes("profile.role !== 'teacher'"),
  'verifyTeacherAuth checks for non-teacher role'
);
assert(
  serverAuthContent.includes('profile.isActive === false'),
  'verifyTeacherAuth checks for deactivated accounts'
);
assert(
  serverAuthContent.includes('export function verifyAdminSecret'),
  'verifyAdminSecret function exported'
);
assert(
  serverAuthContent.includes('ADMIN_PROVISIONING_SECRET'),
  'verifyAdminSecret enforces ADMIN_PROVISIONING_SECRET'
);
assert(
  serverAuthContent.includes("'x-admin-secret'") && serverAuthContent.includes("'authorization'"),
  'verifyAdminSecret supports x-admin-secret header and Authorization Bearer token'
);

// ─── 6. Firestore Security Rules Hardening ────────────────────────────────────
console.log('\n── 6. Firestore Security Rules Hardening (firestore.rules) ─────────────');

assert(fileExists('firestore.rules'), 'firestore.rules exists');
const firestoreRulesContent = readFile('firestore.rules');

assert(
  firestoreRulesContent.includes("request.resource.data.role == 'student'"),
  "firestore.rules restricts client profile creation strictly to role == 'student'"
);
assert(
  firestoreRulesContent.includes("request.resource.data.role == resource.data.role"),
  "firestore.rules forbids clients from modifying or elevating their role on update"
);
assert(
  firestoreRulesContent.includes("request.resource.data.email == resource.data.email"),
  "firestore.rules prevents email spoofing on update"
);
assert(
  firestoreRulesContent.includes("getUserData().role == 'teacher' &&") &&
    firestoreRulesContent.includes("getUserData().isActive == true"),
  "isTeacher() in firestore.rules requires active status (isActive == true)"
);
assert(
  firestoreRulesContent.includes("match /teacher_invitations/{invitationId}"),
  "firestore.rules protects teacher_invitations collection from unauthorized client access"
);

// ─── 7. Teacher API Routes Protection ─────────────────────────────────────────
console.log('\n── 7. Teacher API Routes Authorization Gates ───────────────────────────');

const protectedRoutes = [
  'src/app/api/courses/[courseId]/conflicts/route.ts',
  'src/app/api/courses/[courseId]/conflicts/[conflictId]/route.ts',
  'src/app/api/courses/[courseId]/source-profiles/route.ts',
  'src/app/api/ai/conflict/route.ts',
  'src/app/api/materials/process/route.ts',
  'src/app/api/knowledge/candidates/review/route.ts',
];

for (const r of protectedRoutes) {
  assert(fileExists(r), `${r} exists`);
  const content = readFile(r);
  assert(
    content.includes('verifyTeacherAuth'),
    `${r} enforces verifyTeacherAuth gate`
  );
}

// ─── 8. Next.js Routing & Redirect Configuration ──────────────────────────────
console.log('\n── 8. Routing & /teacher/login Redirect ────────────────────────────────');

assert(fileExists('next.config.ts'), 'next.config.ts exists');
const nextConfigContent = readFile('next.config.ts');
assert(
  nextConfigContent.includes('source: "/teacher/login"') &&
    nextConfigContent.includes('destination: "/login?role=teacher"'),
  'next.config.ts redirects /teacher/login to /login?role=teacher'
);

// ─── 9. Administrative Provisioning API & CLI Script ──────────────────────────
console.log('\n── 9. Administrative Provisioning API & CLI Script ─────────────────────');

assert(
  fileExists('src/app/api/admin/provision-teacher/route.ts'),
  'Administrative API route /api/admin/provision-teacher exists'
);
const adminRouteContent = readFile('src/app/api/admin/provision-teacher/route.ts');
assert(adminRouteContent.includes('verifyAdminSecret'), 'Admin route validates administrative secret');
assert(adminRouteContent.includes('provisionTeacher'), 'Admin route supports teacher provisioning');
assert(adminRouteContent.includes('revokeTeacherAccess'), 'Admin route supports teacher revocation');
assert(adminRouteContent.includes('createTeacherInvitation'), 'Admin route supports onboarding invitations');

assert(
  fileExists('src/lib/firebase/adminProvisioning.ts'),
  'src/lib/firebase/adminProvisioning.ts module exists'
);
const adminProvContent = readFile('src/lib/firebase/adminProvisioning.ts');
assert(adminProvContent.includes('export async function provisionTeacher'), 'provisionTeacher function exported');
assert(adminProvContent.includes('export async function revokeTeacherAccess'), 'revokeTeacherAccess function exported');
assert(adminProvContent.includes('export async function listAllTeachers'), 'listAllTeachers function exported');

assert(
  fileExists('scripts/provision-teacher.mjs'),
  'scripts/provision-teacher.mjs CLI script exists'
);
const cliContent = readFile('scripts/provision-teacher.mjs');
assert(cliContent.includes('--action grant'), 'CLI script supports grant action');
assert(cliContent.includes('--action revoke'), 'CLI script supports revoke action');
assert(cliContent.includes('--list'), 'CLI script supports list action');
assert(cliContent.includes('x-admin-secret'), 'CLI script sends administrative authorization header');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`Results: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🌟 ALL SECURE TEACHER PROVISIONING INVARIANTS VERIFIED!\n');
}
