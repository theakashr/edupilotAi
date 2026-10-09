"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { logoutUser } from '@/services/auth/authService';

export default function UnauthorizedPage() {
  const { role, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const isDeactivated = profile?.isActive === false;

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow">
        <h1 className="mb-4 text-3xl font-bold text-red-600">Access Denied</h1>
        <p className="mb-8 text-gray-600">
          {isDeactivated ? (
            <span className="text-red-700 font-medium">
              Your account has been deactivated by an administrator. Please reach out to administrative support.
            </span>
          ) : (
            <>
              You do not have permission to access this area. Your current role is{' '}
              <span className="font-semibold">{role || 'unknown'}</span>.
            </>
          )}
        </p>
        
        <div className="flex flex-col gap-4">
          {role === 'teacher' && !isDeactivated && (
            <Link 
              href="/teacher/dashboard"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
            >
              Go to Teacher Dashboard
            </Link>
          )}
          
          {role === 'student' && (
            <Link 
              href="/student/dashboard"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
            >
              Go to Student Dashboard
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
