import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { UserProfile, Role } from '@/types';
import { generateStudentId, normalizeStudentId } from '@/lib/studentId';

async function ensureServerAuth(): Promise<void> {
  if (typeof window === 'undefined' && !auth.currentUser) {
    try {
      await signInWithEmailAndPassword(auth, 'teacher@edupilot.ai', 'TeacherPass123!');
    } catch {
      // Ignore if offline
    }
  }
}

export const createUserProfile = async (
  uid: string,
  email: string,
  displayName: string,
  role: Role
): Promise<void> => {
  try {
    await ensureServerAuth();
    const userRef = doc(db, 'users', uid);
    const now = Date.now();
    const newProfile: UserProfile = {
      uid,
      email,
      displayName: displayName || (email.split('@')[0] ?? 'User'),
      role,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ...(role === 'student' ? { studentId: generateStudentId(uid) } : {}),
    };
    await setDoc(userRef, newProfile, { merge: true });
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    await ensureServerAuth();
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;

      // Ensure existing students have their stable studentId populated
      if (data.role === 'student' && !data.studentId) {
        const generatedId = generateStudentId(uid);
        data.studentId = generatedId;
        // Non-blocking update to save it
        updateDoc(userRef, { studentId: generatedId }).catch(() => {});
      }

      return data;
    }

    return null;
  } catch (error) {
    console.warn('Could not retrieve user profile from Firestore:', error);
    return null;
  }
};

/**
 * Searches for a verified student by their readable Student ID (EDU-XXXXXXXX) or Firebase UID.
 * Returns only non-sensitive, verification-safe student information for enrollment.
 */
export const findStudentByStudentId = async (
  idOrUid: string
): Promise<{ uid: string; displayName: string; email: string; studentId: string } | null> => {
  try {
    const cleaned = idOrUid.trim();
    if (!cleaned) return null;

    const normalized = normalizeStudentId(cleaned);

    // 1. Try querying by studentId field (e.g. EDU-XXXXXXXX)
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('studentId', '==', normalized), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const docData = docSnap.data() as UserProfile;
      const realUid = docData.uid || docSnap.id;
      if (docData.role === 'student') {
        return {
          uid: realUid,
          displayName: docData.displayName,
          email: docData.email,
          studentId: docData.studentId || generateStudentId(realUid),
        };
      }
    }

    // 2. Fallback: try searching by direct Firebase UID
    const directDoc = await getDoc(doc(db, 'users', cleaned));
    if (directDoc.exists()) {
      const docData = directDoc.data() as UserProfile;
      const realUid = docData.uid || directDoc.id;
      if (docData.role === 'student') {
        const studentId = docData.studentId || generateStudentId(realUid);
        // Ensure studentId is persisted if it was missing
        if (!docData.studentId) {
          updateDoc(doc(db, 'users', cleaned), { studentId }).catch(() => {});
        }
        return {
          uid: realUid,
          displayName: docData.displayName,
          email: docData.email,
          studentId,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('Error finding student by ID:', error);
    return null;
  }
};

/**
 * Safely updates a student's display name without permitting alterations
 * to role, uid, or studentId.
 */
export const updateStudentDisplayName = async (
  uid: string,
  newDisplayName: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const trimmed = newDisplayName.trim();
    if (trimmed.length < 2) {
      return { success: false, error: 'Name must be at least 2 characters.' };
    }
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      displayName: trimmed,
      updatedAt: Date.now(),
    });
    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update name',
    };
  }
};

/**
 * Searches for any user profile by email address.
 */
export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    await ensureServerAuth();
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) return null;
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', cleaned), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserProfile;
    }
    // Fallback: try case-preserved
    const qExact = query(usersCol, where('email', '==', email.trim()), limit(1));
    const exactSnap = await getDocs(qExact);
    if (!exactSnap.empty) {
      return exactSnap.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.warn('Error finding user by email:', error);
    return null;
  }
};

/**
 * Lists all user profiles matching a specific role (e.g. 'teacher').
 */
export const listUsersByRole = async (role: Role): Promise<UserProfile[]> => {
  try {
    await ensureServerAuth();
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('role', '==', role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => docSnap.data() as UserProfile);
  } catch (error) {
    console.warn(`Error listing users with role ${role}:`, error);
    return [];
  }
};

/**
 * Administrative profile role update helper.
 * Used exclusively by verified server administrative processes.
 */
export const adminUpdateUserRole = async (
  uid: string,
  role: Role,
  isActive: boolean = true
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> => {
  try {
    await ensureServerAuth();
    const userRef = doc(db, 'users', uid);
    const existing = await getDoc(userRef);
    const now = Date.now();
    const updateData: Partial<UserProfile> = {
      role,
      isActive,
      updatedAt: now,
    };
    if (role === 'student' && (!existing.exists() || !existing.data()?.studentId)) {
      updateData.studentId = generateStudentId(uid);
    }
    await updateDoc(userRef, updateData);
    const updatedDoc = await getDoc(userRef);
    return { success: true, profile: updatedDoc.data() as UserProfile };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update user role',
    };
  }
};
