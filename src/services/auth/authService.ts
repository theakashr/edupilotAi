import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { createUserProfile, getUserProfile } from '@/lib/firebase/firestore';
import { Role } from '@/types';

export const registerUser = async (
  email: string,
  password: string,
  displayName: string
) => {
  try {
    // 1. Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Update the Firebase Auth profile with display name
    await updateProfile(user, { displayName });

    // 3. Create the trusted user profile document in Firestore
    // SECURITY: Public self-registration ALWAYS creates 'student' role.
    // Teacher permissions can only be granted through administrative provisioning.
    const trustedRole: Role = 'student';
    await createUserProfile(user.uid, email, displayName, trustedRole);

    return { user, error: null };
  } catch (error: unknown) {
    let errorMessage = 'An error occurred during registration.';
    const authError = error as { code?: string };
    if (authError.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please log in instead.';
    } else if (authError.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters.';
    } else if (authError.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }
    return { user: null, error: errorMessage };
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: unknown) {
    let errorMessage = 'Failed to log in.';
    const authError = error as { code?: string };
    if (
      authError.code === 'auth/invalid-credential' ||
      authError.code === 'auth/user-not-found' ||
      authError.code === 'auth/wrong-password'
    ) {
      errorMessage = 'Invalid email or password.';
    } else if (authError.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }
    return { user: null, error: errorMessage };
  }
};

/**
 * Sign in or Register with Google OAuth Provider.
 * Automatically provisions a Firestore profile if it's the user's first time.
 * SECURITY: First-time OAuth accounts are ALWAYS provisioned as 'student'.
 * Teacher permissions require administrative provisioning.
 */
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user already has a profile in Firestore
    let profile = await getUserProfile(user.uid);

    // If first-time Google sign-in, initialize user profile strictly as student
    if (!profile) {
      await createUserProfile(
        user.uid,
        user.email || '',
        user.displayName || user.email?.split('@')[0] || 'User',
        'student'
      );
      profile = await getUserProfile(user.uid);
    }

    return { user, profile, error: null };
  } catch (error: unknown) {
    let errorMessage = 'Failed to sign in with Google.';
    const authError = error as { code?: string };
    if (authError.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Google sign-in was cancelled.';
    } else if (authError.code === 'auth/popup-blocked') {
      errorMessage = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    } else if (authError.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'An account already exists with the same email using a different sign-in method.';
    }
    return { user: null, profile: null, error: errorMessage };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch {
    return { error: 'Failed to log out.' };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: unknown) {
    let errorMessage = 'Failed to send password reset email.';
    const authError = error as { code?: string };
    if (authError.code === 'auth/user-not-found') {
      errorMessage = 'No user found with this email address.';
    } else if (authError.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }
    return { success: false, error: errorMessage };
  }
};
