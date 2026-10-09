"use client";

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { role, profile, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isAuthorized =
    isAuthenticated &&
    role !== null &&
    allowedRoles.includes(role) &&
    profile?.isActive !== false;

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Not logged in, redirect to login
        router.push('/login');
      } else if (!isAuthorized) {
        // Logged in but missing profile, wrong role, or deactivated
        router.push('/unauthorized');
      }
    }
  }, [loading, isAuthenticated, isAuthorized, router]);

  if (loading) {
    return (
      <>
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-500">Checking your session...</p>
          </div>
        </div>
        <Suspense fallback={null}>
          <div className="hidden" aria-hidden="true">
            {children}
          </div>
        </Suspense>
      </>
    );
  }

  // Prevent flashing content if not authenticated, wrong role, or deactivated
  if (!isAuthorized) {
    return (
      <Suspense fallback={null}>
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </Suspense>
    );
  }

  return <Suspense fallback={null}>{children}</Suspense>;
}
