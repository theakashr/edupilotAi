/**
 * src/lib/firebase/collections.ts
 *
 * Single source of truth for all Firestore collection names.
 * NEVER hard-code collection name strings elsewhere — import from here.
 */

export const COLLECTIONS = {
  // ─── Core ──────────────────────────────────────────────────────────────────
  USERS: 'users',

  // ─── Courses ───────────────────────────────────────────────────────────────
  COURSES: 'courses',
  COURSE_MEMBERS: 'course_members',

  // ─── Content ───────────────────────────────────────────────────────────────
  MATERIALS: 'materials',
  MATERIAL_CHUNKS: 'material_chunks',
  ANNOUNCEMENTS: 'announcements',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',

  // ─── Assessments ───────────────────────────────────────────────────────────
  ASSESSMENTS: 'assessments',
  ASSESSMENT_ATTEMPTS: 'assessment_attempts',

  // ─── Learning Intelligence & Knowledge Layer ──────────────────────────────
  CONCEPTS: 'concepts',
  CONCEPT_CANDIDATES: 'concept_candidates',
  CONCEPT_RELATIONSHIPS: 'concept_relationships',
  LEARNING_OBJECTIVES: 'learning_objectives',
  CONCEPT_SOURCES: 'concept_sources',
  STUDENT_ACTIVITY: 'student_activity',
  LEARNING_PROFILES: 'learning_profiles',
  LEARNING_GAPS: 'learning_gaps',
  LEARNING_PATHS: 'learning_paths',
  LEARNING_PATH_ITEMS: 'learning_path_items',

  // ─── Source Trust & Conflict Resolution (Phase 8) ────────────────────────
  SOURCE_PROFILES: 'source_profiles',
  SOURCE_CONFLICTS: 'source_conflicts',

  // ─── AI ────────────────────────────────────────────────────────────────────
  AI_RECOMMENDATIONS: 'ai_recommendations',
  AI_DECISION_EVENTS: 'ai_decision_events',

  // ─── Communication ─────────────────────────────────────────────────────────
  TEACHER_MESSAGES: 'teacher_messages',
  STUDENT_MESSAGES: 'student_messages',
  NOTIFICATIONS: 'notifications',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
