"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/firestore';
import { UserProfile, Role } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  isAuthenticated: false,
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const userProfile = await getUserProfile(uid);
      setProfile(userProfile);
    } catch (err) {
      console.warn('AuthContext profile load error:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      await fetchProfile(auth.currentUser.uid);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          await fetchProfile(firebaseUser.uid);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.warn('AuthContext state change error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        loading,
        isAuthenticated: !!user,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
