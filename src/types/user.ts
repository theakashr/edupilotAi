export type Role = 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: number; // Unix ms — kept for Phase 2 backward compatibility
  updatedAt: number;
  isActive: boolean;
  studentId?: string; // Stable unique identifier, e.g. EDU-XXXXXXXX
}
