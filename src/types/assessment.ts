import type { Timestamp } from 'firebase/firestore';

export type AssessmentType = 'diagnostic' | 'quiz' | 'practice' | 'exam';
export type AssessmentDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type AssessmentStatus = 'draft' | 'published' | 'closed';

/**
 * Multiple-choice question structure.
 * Stored securely in the assessment definition.
 */
export interface Question {
  id: string;
  text: string;
  options: string[]; // typically 4 answer options
  correctOptionIndex: number; // 0, 1, 2, 3 (authoritative answer on server)
  explanation?: string; // explanation for answer
  conceptId?: string; // mapped course concept ID
  conceptName?: string; // cached concept name for display
  points: number; // point weight (default 1)
  isAiGenerated?: boolean; // flag if drafted by Agnes AI before teacher review
}

/**
 * Sanitized question structure for students before submission.
 * Never includes correctOptionIndex or explanation.
 */
export interface SanitizedQuestion {
  id: string;
  text: string;
  options: string[];
  conceptId?: string;
  conceptName?: string;
  points: number;
}

export interface AssessmentFeedbackSettings {
  showCorrectAnswers?: boolean;
  showExplanations?: boolean;
}

export interface Assessment {
  id: string;
  courseId: string;
  teacherId: string;
  teacherName?: string;
  courseTitle?: string;
  title: string;
  description?: string;
  instructions?: string;
  type: AssessmentType;
  difficulty: AssessmentDifficulty;
  totalMarks: number;
  durationMinutes?: number;
  status: AssessmentStatus;
  conceptIds?: string[];
  questions?: Question[];
  feedbackSettings?: AssessmentFeedbackSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AttemptStatus = 'in_progress' | 'completed';

export interface QuestionAttemptResult {
  questionId: string;
  questionText?: string;
  options?: string[];
  selectedOptionIndex: number | null;
  isCorrect: boolean;
  correctOptionIndex?: number; // populated only if feedback settings allow
  explanation?: string; // populated only if feedback settings allow
  pointsAwarded: number;
  pointsPossible: number;
  conceptId?: string;
  conceptName?: string;
}

export type ConceptDiagnosticStatus =
  | 'not_assessed'
  | 'insufficient_evidence'
  | 'demonstrated_understanding'
  | 'potential_difficulty';

export interface ConceptDiagnosticSummary {
  conceptId: string;
  conceptName: string;
  questionsCount: number;
  correctCount: number;
  scorePercentage: number;
  status: ConceptDiagnosticStatus;
  details?: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  courseId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  startedAt: Timestamp;
  submittedAt?: Timestamp;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  status: AttemptStatus;
  answers?: Record<string, number>; // questionId -> selectedOptionIndex
  results?: QuestionAttemptResult[];
  conceptBreakdown?: ConceptDiagnosticSummary[];
  submissionReason?: string;
  warningCount?: number;
  createdAt: Timestamp;
}
