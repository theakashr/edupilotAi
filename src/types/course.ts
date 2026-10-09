import type { Timestamp } from 'firebase/firestore';

export type CourseStatus = 'draft' | 'active' | 'archived';

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  /** Primary teacher who owns this course */
  teacherId: string;
  status: CourseStatus;
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CourseMemberStatus = 'active' | 'inactive';

export interface CourseMember {
  id: string;
  courseId: string;
  studentId: string;
  status: CourseMemberStatus;
  joinedAt: Timestamp;
}
