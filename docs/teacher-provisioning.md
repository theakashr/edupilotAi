# EduPilot AI — Secure Teacher Account Provisioning & Authorization

## 1. Security Architecture Overview

EduPilot AI enforces a strict **Single Authentication Provider Architecture** using Firebase Authentication combined with a verified Firestore profile (`users/{uid}`).

```
                                  +------------------------------------+
                                  |       Firebase Authentication      |
                                  |  (Email/Password & Google OAuth)   |
                                  +-----------------+------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |       Firestore Profile Document   |
                                  |           users/{uid}              |
                                  |     role: 'teacher' | 'student'    |
                                  |     isActive: true | false         |
                                  +-----------------+------------------+
                                                    |
                         +--------------------------+--------------------------+
                         |                                                     |
                         v                                                     v
      +--------------------------------------+             +--------------------------------------+
      |         Public Registration          |             |       Administrative Provisioning    |
      |   (registerUser / Google Sign-in)    |             |  (CLI Script / Server API Endpoint)  |
      |                                      |             |                                      |
      |   • STRICTLY FORCED to 'student'     |             |   • Protected by ADMIN_PROVISIONING_ |
      |   • No client role manipulation      |             |     SECRET / Firebase Admin SDK      |
      |   • Cannot grant 'teacher' role      |             |   • Grants 'teacher' role safely     |
      +--------------------------------------+             +--------------------------------------+
```

### Core Security Invariants
1. **No Client Role Manipulation**: Public registration (`/register`) and first-time Google sign-ins strictly provision accounts with `role: 'student'`. Clients can never grant themselves the `teacher` role.
2. **Profile Boundary on Teacher Login**: Anyone attempting to sign in through `/teacher/login` or `/login?role=teacher` is checked against their trusted Firestore profile. If the account is a student or deactivated, the Firebase Auth session is **immediately torn down** (`logoutUser()`), and access is denied.
3. **Defense-in-Depth Protection**:
   - **Page Level**: `<RoleGuard allowedRoles={['teacher']}>` intercepts URL tampering and prevents rendering.
   - **API Level**: Server routes execute `verifyTeacherAuth(userId)` before handling requests.
   - **Database Level**: `firestore.rules` blocks client writes attempting to set or elevate `role: 'teacher'` or alter `isActive`.

---

## 2. Profile Schema (`users/{uid}`)

```typescript
export interface UserProfile {
  uid: string;            // Firebase Authentication UID
  email: string;          // User primary email address
  displayName: string;    // Human-readable full name
  role: 'teacher' | 'student'; // Authorized role (teacher granted only by admin)
  createdAt: number;      // Unix timestamp (ms)
  updatedAt: number;      // Unix timestamp (ms)
  isActive: boolean;      // Account status (false = deactivated access)
  studentId?: string;     // Unique identifier for students (e.g. EDU-XXXXXXXX)
}
```

---

## 3. Provisioning a Teacher Account

Only an explicitly authorized administrative process can grant the `teacher` role.

### Method A: Server-Side CLI Script (`scripts/provision-teacher.mjs`)

Administrators can provision and manage teachers directly from the terminal.

#### 1. Promote an Existing User to Teacher
```bash
node scripts/provision-teacher.mjs --email teacher@example.com --name "Prof. Davis" --action grant
```

#### 2. Create a Brand New Teacher Account with Credentials
```bash
node scripts/provision-teacher.mjs --email newprof@university.edu --name "Dr. Alan Turing" --password "TeacherPass2026!" --action create
```

#### 3. Issue an Onboarding Invitation
```bash
node scripts/provision-teacher.mjs --email onboarding@university.edu --name "Dr. Grace Hopper" --action invite
```

#### 4. List All Teachers
```bash
node scripts/provision-teacher.mjs --list
```

#### 5. Check User Role & Account Status
```bash
node scripts/provision-teacher.mjs --email teacher@example.com --action status
```

---

### Method B: Administrative REST API (`/api/admin/provision-teacher`)

The administrative API is protected by `ADMIN_PROVISIONING_SECRET`. The secret must be supplied in headers:
- Header: `x-admin-secret: <ADMIN_PROVISIONING_SECRET>`
- Or Header: `Authorization: Bearer <ADMIN_PROVISIONING_SECRET>`

#### 1. Grant Teacher Role
**`POST /api/admin/provision-teacher`**
```json
{
  "action": "provision",
  "email": "faculty@institution.edu",
  "displayName": "Dr. Marie Curie"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully promoted faculty@institution.edu (UID: ...) to Teacher.",
  "data": {
    "uid": "f9a2b4...",
    "email": "faculty@institution.edu",
    "displayName": "Dr. Marie Curie",
    "role": "teacher",
    "isActive": true,
    "updatedAt": 1728445000000
  }
}
```

#### 2. Create Teacher with Initial Password
**`POST /api/admin/provision-teacher`**
```json
{
  "action": "provision",
  "email": "newfaculty@institution.edu",
  "displayName": "Dr. Richard Feynman",
  "password": "SecurePassword123!"
}
```

---

## 4. Revoking Teacher Access

EduPilot AI supports two revocation modes:

### Mode 1: Deactivation (`mode: "deactivate"`)
Keeps existing course records intact but sets `isActive: false`. The user is immediately blocked from logging in, denied by `RoleGuard`, and rejected by API routes and Firestore security rules.

```bash
node scripts/provision-teacher.mjs --email faculty@institution.edu --action revoke --mode deactivate
```

Or via API:
```json
{
  "action": "revoke",
  "email": "faculty@institution.edu",
  "mode": "deactivate"
}
```

### Mode 2: Demotion (`mode: "demote"`)
Safely downgrades the account to `role: "student"`. Automatically generates and assigns a deterministic student identifier (`studentId: "EDU-XXXXXXXX"`).

```bash
node scripts/provision-teacher.mjs --email faculty@institution.edu --action revoke --mode demote
```

Or via API:
```json
{
  "action": "revoke",
  "email": "faculty@institution.edu",
  "mode": "demote"
}
```

---

## 5. Security Invariants & Testing Unauthorized Access

| Attack Vector | Security Defense Mechanism | Expected Outcome |
| :--- | :--- | :--- |
| **Student enters credentials on `/teacher/login`** | Client `onSubmit` verifies Firestore `profile.role === 'teacher'` before redirect | User is immediately signed out via `logoutUser()`. Error shown: *"Access Denied: This account is registered as a Student..."* |
| **Student uses Google OAuth on Teacher Login** | `handleGoogleSignIn` verifies trusted profile role | User is immediately signed out via `logoutUser()`. Error shown: *"Access Denied: This Google account is not an authorized teacher account..."* |
| **Student types `/teacher/dashboard` in browser URL** | `<RoleGuard allowedRoles={['teacher']}>` | Children render hidden fallback, client immediately redirected to `/unauthorized`. |
| **Deactivated teacher logs in** | Login checks `profile.isActive !== false` | Session is immediately revoked with error: *"Your teacher account has been deactivated."* |
| **Deactivated teacher visits dashboard** | `RoleGuard` checks `profile?.isActive !== false` | Render blocked, redirected to `/unauthorized`. |
| **Student calls Teacher API (`/api/courses/.../conflicts`)** | `verifyTeacherAuth(userId)` | Returns `HTTP 403 Forbidden: Only authorized teachers may access this resource.` |
| **Client modifies Firestore role directly** | `firestore.rules` enforces `request.resource.data.role == resource.data.role` | Firestore returns `PERMISSION_DENIED`. Privilege escalation blocked. |
| **Client creates account with `role: 'teacher'`** | `firestore.rules` enforces `request.resource.data.role == 'student'` on create | Firestore returns `PERMISSION_DENIED`. |

### Running the Automated Security Verification Suite
```bash
node scripts/test-teacher-provisioning.mjs
```

All 60 security assertions will run and report status:
```
================================================================
   EDUPILOT AI — SECURE TEACHER PROVISIONING TEST SUITE
================================================================
...
Results: 60 passed, 0 failed (Total: 60)
🌟 ALL SECURE TEACHER PROVISIONING INVARIANTS VERIFIED!
```

---

## 6. Environment Configuration

In `.env.local` (server-side only, never prefixed with `NEXT_PUBLIC_`):
```bash
# Administrative provisioning secret (used to authenticate provisioning CLI and API)
ADMIN_PROVISIONING_SECRET=edupilot_super_secret_admin_provisioning_key_2026

# Optional: Firebase Admin SDK Service Account (for production cloud deployments)
# FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```
