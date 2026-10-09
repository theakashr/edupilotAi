/**
 * src/types/index.ts
 *
 * Central export barrel for all EduPilot AI TypeScript types.
 * Import from '@/types' throughout the application.
 */

// ─── User & Auth ──────────────────────────────────────────────────────────────
export type { Role, UserProfile } from './user';

// ─── Courses ──────────────────────────────────────────────────────────────────
export type {
  CourseStatus,
  Course,
  CourseMemberStatus,
  CourseMember,
} from './course';

// ─── Materials ────────────────────────────────────────────────────────────────
export type {
  MaterialType,
  MaterialStatus,
  Material,
  MaterialChunk,
} from './material';

// ─── Assignments & Submissions ────────────────────────────────────────────────
export type {
  AssignmentStatus,
  Assignment,
  SubmissionStatus,
  Submission,
} from './assignment';

// ─── Assessments ──────────────────────────────────────────────────────────────
export type {
  AssessmentType,
  AssessmentDifficulty,
  AssessmentStatus,
  Assessment,
  Question,
  SanitizedQuestion,
  AssessmentFeedbackSettings,
  AttemptStatus,
  AssessmentAttempt,
  QuestionAttemptResult,
  ConceptDiagnosticStatus,
  ConceptDiagnosticSummary,
} from './assessment';

// ─── Knowledge & Concept Mapping ──────────────────────────────────────────────
export type {
  ConceptRelationshipType,
  ConceptRelationship,
  ConceptCandidateStatus,
  ConceptCandidate,
  ConceptSourceReference,
  LearningObjective,
} from './knowledge';

// ─── Learning ─────────────────────────────────────────────────────────────────
export type {
  Concept,
  ActivityType,
  StudentActivity,
  LearningPreferences,
  LearningProfile,
  RiskLevel,
  GapStatus,
  LearningGap,
  LearningPathStatus,
  LearningPathGenerator,
  LearningPath,
  LearningPathItemActivity,
  LearningPathItemStatus,
  LearningPathItem,
} from './learning';

// ─── Communication ────────────────────────────────────────────────────────────
export type {
  AnnouncementTarget,
  Announcement,
  TeacherMessage,
  StudentMessage,
  NotificationType,
  Notification,
} from './communication';

// ─── AI ───────────────────────────────────────────────────────────────────────
export type {
  RecommendationType,
  RecommendationPriority,
  RecommendationStatus,
  AIRecommendation,
  AIEventType,
  AIDecisionEvent,
} from './ai';

// ─── Source Trust & Conflict Resolution (Phase 8) ────────────────────────────
export type {
  TrustTier,
  SourceProfile,
  ConflictSeverity,
  ConflictStatus,
  SourceConflict,
  ResolveConflictInput,
} from './conflict';

export type {
  SourceReference,
  AIAnalysisResponse,
  AIExplanationResponse,
  AgnesTestResponse,
} from '@/services/ai/agnes/agnesTypes';

export type { AIErrorCode } from '@/services/ai/agnes/agnesErrors';


// ─── Database Utilities ───────────────────────────────────────────────────────
export type {
  DbResult,
  PaginationOptions,
  PaginatedResult,
} from './database';

// ─── Adaptive Learning Engine (Phase 10) ──────────────────────────────────────
export type {
  MasteryConfidence,
  ConceptMasteryEstimate,
  StudentCourseMasteryProfile,
  IdentifiedLearningGap,
  AdaptiveActivity,
  AdaptivePlanResult,
  StudentGapSummary,
} from './adaptive';

