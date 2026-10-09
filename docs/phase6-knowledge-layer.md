# EduPilot AI — Phase 6: Knowledge Layer & Concept Mapping Foundation

## Executive Summary

Phase 6 implements the **structured educational Knowledge Layer** for EduPilot AI. It bridges raw document text chunks (`material_chunks` created in Phase 5) and high-level educational intelligence through a **100% deterministic, explainable, human-in-the-loop pipeline**.

In strict compliance with the Phase 6 boundary:
- **NO LLMs or AI APIs**: No Agnes, Gemini, OpenAI, or Claude.
- **NO vector embeddings or vector search**.
- **NO RAG or AI tutoring**.
- **Explainable Signals**: All concept candidates are extracted via deterministic structural heuristics (headings, section numbers, multi-chunk frequency, cross-page spans).
- **Human-in-the-Loop Gate**: Candidates never silently become authoritative concepts without explicit teacher review (Approve, Edit, or Reject).
- **Fine-Grained Provenance**: Every concept maintains source traceability pointing back to specific materials, pages, and chunk IDs.
- **Strict Course Scoping**: Cross-course relationships are strictly prevented.

---

## 1. Knowledge Layer Architecture

```
                       Uploaded Educational Documents
                                     ↓ (Phase 5)
                            material_chunks
                                     ↓
                    Deterministic Candidate Extraction
                 (Headings, Numbered Sections, Key Terms)
                                     ↓
                            concept_candidates
                           (Relevance Score 0–100)
                                     ↓
                       Teacher Review & Approval Gate
                     [Approve]   [Edit & Approve]   [Reject]
                                     ↓
                                  concepts
                          (Authoritative Knowledge)
                                     ↓
                 ┌───────────────────┴───────────────────┐
                 ↓                                       ↓
       concept_relationships                     learning_objectives
  (prerequisite | related | part_of)         (Teacher Curated Competencies)
                 ↓                                       ↓
          concept_sources                         Future Agnes 3.0
      (Fine-Grained Citations)               Intelligent Knowledge Graph
```

---

## 2. Concept Model

The authoritative `Concept` model builds on the foundational Phase 3 interface with backward-compatible lifecycle metadata:

```typescript
export interface Concept {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  difficulty?: number;            // 1–10 relative pedagogical difficulty
  prerequisiteConceptIds?: string[]; // Direct prerequisite concept IDs
  materialIds?: string[];        // IDs of educational materials covering this concept
  status?: 'active' | 'archived'; // Lifecycle status for safe referential preservation
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Difficulty Rules
1. **Teacher-defined difficulty takes unconditional precedence**.
2. If not specified by the teacher, defaults to 5 (Intermediate).
3. Scale is strictly explainable (1 = Introductory, 5 = Intermediate, 10 = Advanced).

---

## 3. Concept Candidate Extraction (Deterministic)

Candidates are detected deterministically from `material_chunks` using pure structural and linguistic patterns:

1. **Explicit Section Headings**:
   - `chunk.sectionTitle` metadata preserved from document chunking.
   - In-body headings matching educational numbering patterns (e.g. `2.1 Dynamic Memory Allocation` -> `Dynamic Memory Allocation`).
2. **Technical Phrase Detection**:
   - Capitalized multi-word technical entities (2–4 words, e.g. `Binary Search Tree`, `Pointer Arithmetic`).
   - Definition syntax patterns (e.g. `X is defined as...`, `X refers to...`).
3. **Conservative Filtering**:
   - Stopwords filter (common English functional words).
   - Generic educational artifacts filter (`chapter`, `section`, `table of contents`, `introduction`, `summary`, `exercises`, `page`, etc.).
   - Pure numbers, URLs, and file extension filters.

---

## 4. Candidate Scoring & Relevance Method

Candidates are assigned an explainable **Relevance Score (0–100)**:

| Signal | Score Contribution | Explanation |
| :--- | :--- | :--- |
| **Section Heading** | +35 pts | Term appears as an explicit document section title |
| **Multiple Headings** | +15 pts | Term appears across multiple chapter/section headings |
| **Multi-Chunk Span (>=3)** | +25 pts | Term appears across 3 or more distinct document chunks |
| **Multi-Chunk Span (=2)** | +15 pts | Term appears across 2 distinct document chunks |
| **Multi-Page Span (>=3)** | +15 pts | Term spans 3 or more distinct document pages |
| **Multi-Page Span (=2)** | +10 pts | Term spans 2 distinct document pages |
| **High Frequency (>=4)** | +10 pts | High frequency within technical discourse |
| **Multi-word Technical Structure** | +5 pts | Multi-word phrase structure (e.g. `Linked List`) |

Every candidate records a human-readable array of `scoringSignals` (e.g. `["Explicit document section heading", "Present across 3 distinct document chunks", "Spans 2 document pages"]`).

---

## 5. Teacher Review Workflow (Human-in-the-Loop)

Concept candidates **never** become authoritative concepts automatically:

```
Candidate Queue (Pending)
   │
   ├── Approve ───────────────> Concept created + Sources logged + Status = 'approved'
   │
   ├── Edit & Approve ────────> Modified Name/Desc/Diff created + Status = 'approved'
   │
   └── Reject ────────────────> Status = 'rejected' (No concept created)
```

---

## 6. Concept Relationships

Educational concepts are connected using directed relationships:

```typescript
export type ConceptRelationshipType = 'prerequisite' | 'related' | 'part_of';

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
```

### Relationship Semantics & Direction
- `prerequisite`: `Concept A` is a prerequisite for `Concept B` (students must learn Concept A before Concept B).
- `related`: `Concept A` and `Concept B` share educational context.
- `part_of`: `Concept A` is a sub-concept or component of `Concept B`.
- **Self-Loops Blocked**: `sourceConceptId !== targetConceptId`.
- **Backward Compatibility**: When a `prerequisite` relationship is created, `targetConcept.prerequisiteConceptIds` is automatically synchronized.

---

## 7. Strict Cross-Course Security

A relationship between concepts from different courses (e.g. Course A -> Course B) is **categorically blocked**:
```typescript
if (source.courseId !== input.courseId || target.courseId !== input.courseId) {
  throw new Error("Cross-course relationships are strictly prohibited.");
}
```
Validation occurs at both the Zod schema level and the service layer.

---

## 8. Source Provenance & Citations

Every authoritative concept links back to the exact chunk and page:

```typescript
export interface ConceptSourceReference {
  id: string;
  conceptId: string;
  courseId: string;
  materialId: string;
  materialChunkId: string;
  pageNumber?: number;
  evidenceText?: string; // Concise snippet (<= 300 chars)
  createdAt: Timestamp;
}
```

This ensures future grounded citations (Agnes 3.0 Flash in Phase 7+) without storing redundant massive document bodies.

---

## 9. Duplicate Concept Handling

Normalized name comparison (`normalizeConceptName`):
- Lowercase conversion
- Punctuation and special character removal
- Internal whitespace normalization
- When a candidate matches an existing concept in the course, a `Likely duplicate detected` warning is displayed, alerting the teacher.

---

## 10. Referential Integrity & Safe Archiving

Before deleting a concept, `checkDependencies()` inspects:
1. Other concepts listing it in `prerequisiteConceptIds`.
2. Directed entries in `concept_relationships`.
3. Linked entries in `learning_objectives`.

If references exist, the system safely **archives** the concept (`status = 'archived'`) to prevent broken references and database corruption.

---

## 11. Learning Objectives

Teacher-defined educational competencies:

```typescript
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
```

Curated entirely by the course teacher in Phase 6 (no AI hallucination).

---

## 12. Security Rules (Firestore)

Rules added to `firestore.rules`:
- `concept_candidates`: Readable and writable only by the teacher of the course.
- `concepts`, `concept_relationships`, `learning_objectives`, `concept_sources`: Readable by authenticated users (teachers and students of the course); writable ONLY by the owning teacher.
- Students cannot approve, reject, or modify knowledge data.

---

## 13. Future Agnes 3.0 Integration Point (Phase 7+)

Phase 6 forms the clean deterministic boundary:

```
Phase 6 (Current):
  material_chunks ──> Deterministic Candidates ──> Teacher Review ──> Concepts

Phase 7 (Future):
  Approved Concepts + material_chunks
            ↓
     Agnes 3.0 Flash
            ↓
  Intelligent Graph Enrichment (missing links, explanations, adaptive paths)
```

Phase 7 has **not** been started.
