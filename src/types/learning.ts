import type { Timestamp } from 'firebase/firestore';

// ─── Concepts (Knowledge Graph foundation) ───────────────────────────────────

export interface Concept {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  /** Relative difficulty 1–10 */
  difficulty?: number;
  /** IDs of concepts that must be understood first */
  prerequisiteConceptIds?: string[];
  /** IDs of materials that cover this concept */
  materialIds?: string[];
  /** Lifecycle status: active or safely archived */
  status?: 'active' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Student Activity (Behavioral signals for AI) ─────────────────────────────

export type ActivityType =
  | 'lesson_started'
  | 'lesson_completed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'assignment_submitted'
  | 'material_viewed'
  | 'question_asked';

export interface StudentActivity {
  id: string;
  studentId: string;
  courseId: string;
  activityType: ActivityType;
  /** ID of the related entity (e.g. materialId, assignmentId) */
  referenceId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Timestamp;
}

// ─── Learning Profile ─────────────────────────────────────────────────────────

export interface LearningPreferences {
  preferredContentType?: string;
  preferredDifficulty?: string;
}

export interface LearningProfile {
  id: string;
  studentId: string;
  courseId: string;
  preferredLanguage?: string;
  learningPreferences?: LearningPreferences;
  /** Overall mastery score 0–100 */
  overallMastery?: number;
  lastUpdatedAt: Timestamp;
}

// ─── Learning Gaps ────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high';
export type GapStatus = 'open' | 'improving' | 'resolved';

export interface LearningGap {
  id: string;
  studentId: string;
  courseId: string;
  conceptId: string;
  /** Current mastery level 0–100 */
  currentMastery?: number;
  riskLevel: RiskLevel;
  /** true = AI-predicted, false = teacher/system identified */
  predicted: boolean;
  reason?: string;
  /** Array of evidence strings: e.g. ["Failed quiz attempt 2", "Low score on assignment 3"] */
  evidence?: string[];
  status: GapStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Learning Paths ───────────────────────────────────────────────────────────

export type LearningPathStatus = 'draft' | 'active' | 'completed' | 'paused';
export type LearningPathGenerator = 'teacher' | 'ai' | 'hybrid';

export interface LearningPath {
  id: string;
  studentId: string;
  courseId: string;
  title: string;
  status: LearningPathStatus;
  generatedBy: LearningPathGenerator;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type LearningPathItemActivity =
  | 'lesson'
  | 'practice'
  | 'quiz'
  | 'revision'
  | 'assignment';

export type LearningPathItemStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped';

export interface LearningPathItem {
  id: string;
  learningPathId: string;
  studentId: string;
  courseId: string;
  /** Ordering position within the path */
  order: number;
  conceptId?: string;
  activityType: LearningPathItemActivity;
  referenceId?: string;
  status: LearningPathItemStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
