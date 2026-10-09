import type { Timestamp } from 'firebase/firestore';

// ─── AI Recommendations ───────────────────────────────────────────────────────

export type RecommendationType =
  | 'learning'
  | 'intervention'
  | 'assessment'
  | 'resource'
  | 'replanning';

export type RecommendationPriority = 'low' | 'medium' | 'high';

/**
 * Status lifecycle:
 *   pending → (teacher reviews) → approved | rejected
 *   approved → executed
 *
 * This enforces the human-in-the-loop architecture:
 * AI recommends → Teacher reviews → Teacher approves/rejects → Action taken
 */
export type RecommendationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed';

export interface AIRecommendation {
  id: string;
  courseId: string;
  studentId?: string;
  type: RecommendationType;
  title: string;
  explanation: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  /** Always 'ai' — AI cannot self-approve */
  createdBy: 'ai';
  /** UID of teacher who reviewed */
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── AI Decision Events (Explainability / Audit log) ─────────────────────────

export type AIEventType =
  | 'recommendation'
  | 'prediction'
  | 'replanning'
  | 'source_conflict'
  | 'teacher_override'
  | 'analysis'
  | 'explanation';


/**
 * Immutable audit trail for all AI decisions.
 * Future explainability: "Why did AI recommend revising pointers?"
 * Answer: read the reasoning + evidence from the event record.
 */
export interface AIDecisionEvent {
  id: string;
  courseId: string;
  studentId?: string;
  eventType: AIEventType;
  summary: string;
  reasoning?: string;
  createdAt: Timestamp;
}
