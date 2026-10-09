/**
 * src/lib/firebase/adminProvisioning.ts
 *
 * Core administrative teacher provisioning and revocation engine.
 * Executed ONLY on the server via authorized administrative entry points.
 * NEVER import this file in client/browser components.
 */

import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  createUserProfile,
  getUserProfile,
  findUserByEmail,
  adminUpdateUserRole,
  listUsersByRole,
} from '@/lib/firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile, Role } from '@/types';

export interface ProvisionTeacherParams {
  email: string;
  displayName?: string;
  uid?: string;
  password?: string;
}

export interface RevokeTeacherParams {
  email?: string;
  uid?: string;
  mode?: 'deactivate' | 'demote';
}

export interface TeacherInvitation {
  id: string;
  token: string;
  email: string;
  name?: string;
  status: 'pending' | 'claimed' | 'revoked' | 'expired';
  createdAt: number;
  expiresAt: number;
  claimedBy?: string;
  claimedAt?: number;
}

export interface ProvisioningResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Creates or promotes an account to the 'teacher' role through a verified administrative process.
 */
export async function provisionTeacher(
  params: ProvisionTeacherParams
): Promise<ProvisioningResult<UserProfile>> {
  const email = params.email?.trim().toLowerCase();
  const displayName = params.displayName?.trim() || (email ? email.split('@')[0] : 'Teacher');
  let targetUid = params.uid?.trim();

  if (!email && !targetUid) {
    return {
      success: false,
      message: 'Failed to provision teacher',
      error: 'Either email or uid is required to provision a teacher.',
    };
  }

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();

    // 1. If Firebase Admin SDK is available, use trusted Admin SDK methods
    if (adminAuth && adminDb) {
      let authUserRecord;
      try {
        if (targetUid) {
          authUserRecord = await adminAuth.getUser(targetUid);
        } else if (email) {
          authUserRecord = await adminAuth.getUserByEmail(email);
          targetUid = authUserRecord.uid;
        }
      } catch {
        // User not found in Firebase Auth
        authUserRecord = null;
      }

      // If user doesn't exist in Firebase Auth yet, create them if password is provided
      if (!authUserRecord) {
        if (!params.password) {
          // If no password provided, user must register themselves or be created
          if (!targetUid) {
            return {
              success: false,
              message: 'User does not exist in Firebase Auth',
              error:
                'User not found in Firebase Auth. Provide a password to create the account, or have the user register first.',
            };
          }
        } else {
          const newAuthUser = await adminAuth.createUser({
            email,
            password: params.password,
            displayName,
          });
          targetUid = newAuthUser.uid;
        }
      }

      if (!targetUid) {
        return {
          success: false,
          message: 'Failed to resolve user identifier',
          error: 'Could not determine UID for provisioning.',
        };
      }

      // Update / create document in Firestore users/{targetUid}
      const userDocRef = adminDb.collection('users').doc(targetUid);
      const userDocSnap = await userDocRef.get();
      const now = Date.now();

      const profileData: UserProfile = {
        uid: targetUid,
        email: email || userDocSnap.data()?.email || '',
        displayName: displayName || userDocSnap.data()?.displayName || 'Teacher',
        role: 'teacher',
        isActive: true,
        createdAt: userDocSnap.exists ? userDocSnap.data()?.createdAt || now : now,
        updatedAt: now,
      };

      await userDocRef.set(profileData, { merge: true });

      return {
        success: true,
        message: `Successfully provisioned teacher account for ${profileData.email} (${targetUid}).`,
        data: profileData,
      };
    }

    // 2. Fallback: Server-side operation using Firestore client SDK
    // Find existing profile in Firestore
    let existingProfile: UserProfile | null = null;
    if (targetUid) {
      existingProfile = await getUserProfile(targetUid);
    } else if (email) {
      existingProfile = await findUserByEmail(email);
      if (existingProfile) {
        targetUid = existingProfile.uid;
      }
    }

    // If user doesn't exist in Firebase Auth and password is provided, create via REST
    if (!targetUid && email && params.password) {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (apiKey) {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: params.password,
              returnSecureToken: true,
            }),
          }
        );
        const json = await res.json();
        if (json.localId) {
          targetUid = json.localId;
        } else if (json.error?.message === 'EMAIL_EXISTS') {
          // User already exists in Auth. Authenticate to obtain their UID
          const signInRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                password: params.password,
                returnSecureToken: true,
              }),
            }
          );
          const signInJson = await signInRes.json();
          if (signInJson.localId) {
            targetUid = signInJson.localId;
          } else {
            return {
              success: false,
              message: 'Authentication failed for existing user',
              error: signInJson.error?.message || 'Invalid password for existing account.',
            };
          }
        } else {
          return {
            success: false,
            message: 'Firebase Auth creation failed',
            error: json.error?.message || 'Could not create Firebase Auth account',
          };
        }
      }
    }

    if (!targetUid) {
      return {
        success: false,
        message: 'User profile not found',
        error:
          'No existing user was found with that email. User must first create an account or provide a password for account creation.',
      };
    }

    let didSignIn = false;
    if (params.password && email) {
      try {
        await signInWithEmailAndPassword(auth, email, params.password);
        didSignIn = true;
      } catch {
        // If sign-in is not possible, continue with fallback
      }
    }

    try {
      // Update or create profile in Firestore
      if (existingProfile) {
        const updateRes = await adminUpdateUserRole(targetUid, 'teacher', true);
        if (!updateRes.success || !updateRes.profile) {
          return {
            success: false,
            message: 'Failed to update user profile in Firestore',
            error: updateRes.error || 'Firestore update failed',
          };
        }
        return {
          success: true,
          message: `Successfully promoted ${existingProfile.email} (${targetUid}) to Teacher.`,
          data: updateRes.profile,
        };
      } else {
        // User existed in Auth or was created, now create their profile in Firestore
        await createUserProfile(targetUid, email, displayName, 'teacher');
        const newProfile = await getUserProfile(targetUid);
        return {
          success: true,
          message: `Successfully created teacher profile for ${email} (${targetUid}).`,
          data: newProfile || undefined,
        };
      }
    } finally {
      if (didSignIn) {
        await signOut(auth).catch(() => {});
      }
    }
  } catch (err: unknown) {
    console.error('[adminProvisioning] provisionTeacher error:', err);
    return {
      success: false,
      message: 'Internal server error while provisioning teacher.',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Revokes teacher access by either deactivating the account or demoting to student.
 */
export async function revokeTeacherAccess(
  params: RevokeTeacherParams
): Promise<ProvisioningResult<UserProfile>> {
  const mode = params.mode || 'demote';
  let targetUid = params.uid?.trim();
  const email = params.email?.trim().toLowerCase();

  if (!targetUid && !email) {
    return {
      success: false,
      message: 'Failed to revoke teacher access',
      error: 'Either email or uid is required.',
    };
  }

  try {
    const adminDb = getAdminFirestore();

    // Resolve target UID
    if (!targetUid && email) {
      const existing = await findUserByEmail(email);
      if (existing) {
        targetUid = existing.uid;
      }
    }

    if (!targetUid) {
      return {
        success: false,
        message: 'User not found',
        error: `No user found matching email ${email}.`,
      };
    }

    const now = Date.now();

    // 1. If Firebase Admin SDK is available
    if (adminDb) {
      const userDocRef = adminDb.collection('users').doc(targetUid);
      const userDocSnap = await userDocRef.get();

      if (!userDocSnap.exists) {
        return {
          success: false,
          message: 'User profile does not exist in Firestore.',
          error: 'User not found.',
        };
      }

      const updateData: Record<string, unknown> = {
        updatedAt: now,
      };

      if (mode === 'deactivate') {
        updateData.isActive = false;
      } else {
        updateData.role = 'student';
        updateData.isActive = true;
      }

      await userDocRef.update(updateData);
      const updatedSnap = await userDocRef.get();
      return {
        success: true,
        message:
          mode === 'deactivate'
            ? `Successfully deactivated teacher account (${targetUid}).`
            : `Successfully demoted teacher (${targetUid}) to student.`,
        data: updatedSnap.data() as UserProfile,
      };
    }

    // 2. Fallback: Firestore client SDK
    const newRole: Role = mode === 'deactivate' ? 'teacher' : 'student';
    const newActiveState = mode !== 'deactivate';

    const result = await adminUpdateUserRole(targetUid, newRole, newActiveState);
    if (!result.success || !result.profile) {
      return {
        success: false,
        message: 'Failed to update user profile in Firestore',
        error: result.error || 'Update failed',
      };
    }

    return {
      success: true,
      message:
        mode === 'deactivate'
          ? `Successfully deactivated teacher account (${targetUid}).`
          : `Successfully demoted teacher (${targetUid}) to student.`,
      data: result.profile,
    };
  } catch (err: unknown) {
    console.error('[adminProvisioning] revokeTeacherAccess error:', err);
    return {
      success: false,
      message: 'Failed to revoke teacher access.',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Returns all teacher profiles in the system.
 */
export async function listAllTeachers(): Promise<UserProfile[]> {
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snap = await adminDb.collection('users').where('role', '==', 'teacher').get();
      return snap.docs.map((docSnap: { data: () => Record<string, unknown> }) => docSnap.data() as unknown as UserProfile);
    }
    return await listUsersByRole('teacher');
  } catch (err) {
    console.error('[adminProvisioning] listAllTeachers error:', err);
    return [];
  }
}

/**
 * Inspects role and status for a given email or UID.
 */
export async function getTeacherStatus(identifier: string): Promise<UserProfile | null> {
  const cleaned = identifier.trim();
  if (!cleaned) return null;

  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      // Try UID first
      const byUid = await adminDb.collection('users').doc(cleaned).get();
      if (byUid.exists) {
        return byUid.data() as UserProfile;
      }
      // Try email
      const byEmail = await adminDb
        .collection('users')
        .where('email', '==', cleaned.toLowerCase())
        .limit(1)
        .get();
      if (!byEmail.empty) {
        return byEmail.docs[0].data() as UserProfile;
      }
      return null;
    }

    // Fallback: client SDK
    const profile = await getUserProfile(cleaned);
    if (profile) return profile;
    return await findUserByEmail(cleaned);
  } catch (err) {
    console.error('[adminProvisioning] getTeacherStatus error:', err);
    return null;
  }
}

/**
 * Generates an institutional teacher invitation token.
 */
export async function createTeacherInvitation(
  email: string,
  name?: string,
  expiresInHours: number = 72
): Promise<ProvisioningResult<TeacherInvitation>> {
  const cleanedEmail = email.trim().toLowerCase();
  if (!cleanedEmail) {
    return {
      success: false,
      message: 'Failed to create invitation',
      error: 'A valid recipient email address is required.',
    };
  }

  try {
    const now = Date.now();
    const token = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiresAt = now + expiresInHours * 60 * 60 * 1000;

    const invitation: TeacherInvitation = {
      id: token,
      token,
      email: cleanedEmail,
      name: name?.trim() || '',
      status: 'pending',
      createdAt: now,
      expiresAt,
    };

    const invRef = doc(db, 'teacher_invitations', token);
    await setDoc(invRef, invitation);

    return {
      success: true,
      message: `Teacher invitation generated for ${cleanedEmail}. Valid for ${expiresInHours} hours.`,
      data: invitation,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: 'Failed to create invitation.',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Validates and claims a teacher invitation token, promoting the user to teacher.
 */
export async function claimTeacherInvitation(
  token: string,
  uid: string,
  email: string
): Promise<ProvisioningResult<UserProfile>> {
  const cleanedToken = token.trim().toUpperCase();
  const cleanedEmail = email.trim().toLowerCase();

  if (!cleanedToken || !uid || !cleanedEmail) {
    return {
      success: false,
      message: 'Missing required parameters to claim invitation.',
      error: 'Token, UID, and email are required.',
    };
  }

  try {
    const invRef = doc(db, 'teacher_invitations', cleanedToken);
    const invSnap = await getDoc(invRef);

    if (!invSnap.exists()) {
      return {
        success: false,
        message: 'Invalid invitation token.',
        error: 'The provided invitation code does not exist.',
      };
    }

    const invitation = invSnap.data() as TeacherInvitation;

    if (invitation.status !== 'pending') {
      return {
        success: false,
        message: 'Invitation is no longer valid.',
        error: `This invitation has already been ${invitation.status}.`,
      };
    }

    if (Date.now() > invitation.expiresAt) {
      await updateDoc(invRef, { status: 'expired' });
      return {
        success: false,
        message: 'Invitation expired.',
        error: 'This teacher invitation code has expired. Please request a new one.',
      };
    }

    if (invitation.email.toLowerCase() !== cleanedEmail) {
      return {
        success: false,
        message: 'Email mismatch.',
        error: 'This invitation was issued to a different email address.',
      };
    }

    // Burn the token
    const now = Date.now();
    await updateDoc(invRef, {
      status: 'claimed',
      claimedBy: uid,
      claimedAt: now,
    });

    // Promote the user to teacher
    return await provisionTeacher({
      uid,
      email: cleanedEmail,
      displayName: invitation.name,
    });
  } catch (err: unknown) {
    return {
      success: false,
      message: 'Failed to claim teacher invitation.',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
