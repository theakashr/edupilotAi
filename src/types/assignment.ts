import type { Timestamp } from 'firebase/firestore';

export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface Assignment {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: Timestamp;
  status: AssignmentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SubmissionStatus = 'submitted' | 'late' | 'graded';

export interface Submission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  submittedAt: Timestamp;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Timestamp;
}
