import type { Timestamp } from 'firebase/firestore';

export type AssessmentType = 'diagnostic' | 'quiz' | 'practice' | 'exam';
export type AssessmentDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type AssessmentStatus = 'draft' | 'published' | 'closed';

export interface Assessment {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  description?: string;
  type: AssessmentType;
  difficulty: AssessmentDifficulty;
  totalMarks: number;
  status: AssessmentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AttemptStatus = 'in_progress' | 'completed';

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  courseId: string;
  studentId: string;
  startedAt: Timestamp;
  submittedAt?: Timestamp;
  score?: number;
  percentage?: number;
  status: AttemptStatus;
  createdAt: Timestamp;
}
