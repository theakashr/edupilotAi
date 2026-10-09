import type { Timestamp } from 'firebase/firestore';

/**
 * Supported concept relationship types in the knowledge graph.
 */
export type ConceptRelationshipType = 'prerequisite' | 'related' | 'part_of';

/**
 * Directed relationship between two concepts within the same course.
 *
 * Example:
 * sourceConceptId (Arrays) --[prerequisite]--> targetConceptId (Pointers)
 * Meaning: Arrays must be understood before Pointers.
 */
export interface ConceptRelationship {
  id: string;
  courseId: string;
  sourceConceptId: string;
  targetConceptId: string;
  type: ConceptRelationshipType;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Status of a deterministically extracted concept candidate in the human-in-the-loop workflow.
 */
export type ConceptCandidateStatus = 'pending' | 'approved' | 'rejected';

/**
 * Represents a deterministically extracted candidate concept from document chunks.
 * Must be reviewed and approved by the teacher before becoming an authoritative Concept.
 */
export interface ConceptCandidate {
  id: string;
  courseId: string;
  materialId: string;
  name: string;
  /** Lowercase, stripped name used for duplicate identification */
  normalizedName: string;
  description?: string;
  /** Chunk IDs where this candidate was identified */
  sourceChunkIds: string[];
  /** 1-indexed document page numbers containing this candidate */
  sourcePages: number[];
  /** Explainable deterministic relevance score 0–100 */
  relevanceScore: number;
  /** Deterministic reasons and signals contributing to the score */
  scoringSignals: string[];
  /** Existing concept ID if candidate matches an already approved concept */
  duplicateOfConceptId?: string;
  status: ConceptCandidateStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  /** Concept ID created upon approval */
  conceptId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Fine-grained source provenance linking an authoritative concept to a specific material chunk.
 * Enables grounded citations and source traceability.
 */
export interface ConceptSourceReference {
  id: string;
  conceptId: string;
  courseId: string;
  materialId: string;
  materialChunkId: string;
  pageNumber?: number;
  /** Short snippet (up to 300 chars) highlighting the concept in context */
  evidenceText?: string;
  createdAt: Timestamp;
}

/**
 * Teacher-defined learning objective linked to concepts and materials.
 */
export interface LearningObjective {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  conceptIds: string[];
  materialIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
