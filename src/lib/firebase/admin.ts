/**
 * src/lib/firebase/admin.ts
 *
 * Secure Firebase Admin SDK initialization for server-side trusted processes.
 * NEVER import this file from browser / client components.
 */

import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

export function getFirebaseAdminApp(): App | null {
  if (typeof window !== 'undefined') {
    throw new Error('Security Error: Firebase Admin SDK must never be initialized on the client!');
  }

  if (adminApp) return adminApp;
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'edupilot-a';

  try {
    if (serviceAccountKey) {
      const parsed = JSON.parse(serviceAccountKey);
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      return adminApp;
    }

    if (clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      return adminApp;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      return adminApp;
    }
  } catch (err) {
    console.warn('[Firebase Admin] Service account initialization notice:', err);
  }

  return null;
}

export function getAdminFirestore(): Firestore | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return getFirestore(app);
}

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return getAuth(app);
}
