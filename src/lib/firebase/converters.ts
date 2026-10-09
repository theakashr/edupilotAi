import {
  collection,
  doc,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from './collections';

/**
 * Strips all undefined fields recursively from an object before saving to Firestore.
 * Firestore strictly rejects documents containing undefined values.
 */
function removeUndefinedFields(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Preserve Firestore FieldValue, Timestamps, and Date objects
  if (
    typeof (value as { toMillis?: unknown }).toMillis === 'function' ||
    typeof (value as { isEqual?: unknown }).isEqual === 'function' ||
    value instanceof Date
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(removeUndefinedFields);
  }

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v !== undefined) {
      result[k] = removeUndefinedFields(v);
    }
  }
  return result;
}

/**
 * Creates a strongly-typed Firestore converter for any document type.
 *
 * Usage:
 *   const coursesRef = collection(db, COLLECTIONS.COURSES).withConverter(makeConverter<Course>());
 *
 * This ensures toFirestore and fromFirestore are both type-safe and undefined-safe.
 */
export function makeConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): DocumentData {
      return removeUndefinedFields(data) as DocumentData;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions
    ): T {
      return snapshot.data(options) as T;
    },
  };
}


/**
 * Returns a typed collection reference.
 * Centralizes collection access so types are automatically applied.
 *
 * @example
 *   const courses = typedCollection<Course>(COLLECTIONS.COURSES);
 */
export function typedCollection<T extends DocumentData>(collectionName: string) {
  return collection(db, collectionName).withConverter(makeConverter<T>());
}

/**
 * Returns a typed document reference.
 *
 * @example
 *   const courseRef = typedDoc<Course>(COLLECTIONS.COURSES, courseId);
 */
export function typedDoc<T extends DocumentData>(
  collectionName: string,
  ...pathSegments: string[]
) {
  return doc(db, collectionName, ...pathSegments).withConverter(
    makeConverter<T>()
  );
}

// ─── Pre-built typed references for all collections ──────────────────────────

import type {
  Course,
  CourseMember,
  Material,
  MaterialChunk,
  Assignment,
  Submission,
  Assessment,
  AssessmentAttempt,
  Concept,
  ConceptCandidate,
  ConceptRelationship,
  LearningObjective,
  ConceptSourceReference,
  StudentActivity,
  LearningProfile,
  LearningGap,
  LearningPath,
  LearningPathItem,
  AIRecommendation,
  AIDecisionEvent,
  Announcement,
  TeacherMessage,
  StudentMessage,
  Notification,
  SourceProfile,
  SourceConflict,
} from '@/types';

export const courseCollection = () =>
  typedCollection<Course>(COLLECTIONS.COURSES);

export const courseMemberCollection = () =>
  typedCollection<CourseMember>(COLLECTIONS.COURSE_MEMBERS);

export const materialCollection = () =>
  typedCollection<Material>(COLLECTIONS.MATERIALS);

export const materialChunkCollection = () =>
  typedCollection<MaterialChunk>(COLLECTIONS.MATERIAL_CHUNKS);

export const assignmentCollection = () =>
  typedCollection<Assignment>(COLLECTIONS.ASSIGNMENTS);

export const submissionCollection = () =>
  typedCollection<Submission>(COLLECTIONS.SUBMISSIONS);

export const assessmentCollection = () =>
  typedCollection<Assessment>(COLLECTIONS.ASSESSMENTS);

export const assessmentAttemptCollection = () =>
  typedCollection<AssessmentAttempt>(COLLECTIONS.ASSESSMENT_ATTEMPTS);

export const conceptCollection = () =>
  typedCollection<Concept>(COLLECTIONS.CONCEPTS);

export const conceptCandidateCollection = () =>
  typedCollection<ConceptCandidate>(COLLECTIONS.CONCEPT_CANDIDATES);

export const conceptRelationshipCollection = () =>
  typedCollection<ConceptRelationship>(COLLECTIONS.CONCEPT_RELATIONSHIPS);

export const learningObjectiveCollection = () =>
  typedCollection<LearningObjective>(COLLECTIONS.LEARNING_OBJECTIVES);

export const conceptSourceCollection = () =>
  typedCollection<ConceptSourceReference>(COLLECTIONS.CONCEPT_SOURCES);

export const studentActivityCollection = () =>
  typedCollection<StudentActivity>(COLLECTIONS.STUDENT_ACTIVITY);

export const learningProfileCollection = () =>
  typedCollection<LearningProfile>(COLLECTIONS.LEARNING_PROFILES);

export const learningGapCollection = () =>
  typedCollection<LearningGap>(COLLECTIONS.LEARNING_GAPS);

export const learningPathCollection = () =>
  typedCollection<LearningPath>(COLLECTIONS.LEARNING_PATHS);

export const learningPathItemCollection = () =>
  typedCollection<LearningPathItem>(COLLECTIONS.LEARNING_PATH_ITEMS);

export const aiRecommendationCollection = () =>
  typedCollection<AIRecommendation>(COLLECTIONS.AI_RECOMMENDATIONS);

export const aiDecisionEventCollection = () =>
  typedCollection<AIDecisionEvent>(COLLECTIONS.AI_DECISION_EVENTS);

export const announcementCollection = () =>
  typedCollection<Announcement>(COLLECTIONS.ANNOUNCEMENTS);

export const teacherMessageCollection = () =>
  typedCollection<TeacherMessage>(COLLECTIONS.TEACHER_MESSAGES);

export const studentMessageCollection = () =>
  typedCollection<StudentMessage>(COLLECTIONS.STUDENT_MESSAGES);

export const notificationCollection = () =>
  typedCollection<Notification>(COLLECTIONS.NOTIFICATIONS);

// ─── Phase 8: Source Trust & Conflict Resolution ──────────────────────────────

export const sourceProfileCollection = () =>
  typedCollection<SourceProfile>(COLLECTIONS.SOURCE_PROFILES);

export const sourceConflictCollection = () =>
  typedCollection<SourceConflict>(COLLECTIONS.SOURCE_CONFLICTS);
