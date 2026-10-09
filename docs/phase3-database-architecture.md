# EduPilot AI — Phase 3 Database & Data Model Architecture

## 1. Overview

Phase 3 establishes the complete, production-ready Firestore database architecture, data models, validation schemas, repository services, security rules, and indexing strategy for **EduPilot AI**.

The database architecture is designed specifically to power:
- Multi-tenant Course Management
- Knowledge Chunking for RAG / Agnes AI Vector pipelines
- Formative & Summative Assessments
- Student Knowledge Graphs & Adaptive Learning Paths
- Human-in-the-Loop AI Recommendations & Decision Auditing
- Teacher-Student Communication & Notification Center

---

## 2. Firestore Collection Architecture (20 Collections)

| Collection | Description | Owner / Role | Security Model |
| :--- | :--- | :--- | :--- |
| `users` | User accounts and role claims (`teacher` or `student`) | Owner | Self-read, self-create; updates locked from client |
| `courses` | Course workspaces created by teachers | Teacher | Authenticated read; teacher creates/modifies |
| `course_members` | Student course enrollments | Teacher/Student | Student/teacher read; teacher/student creates |
| `materials` | Educational files, books, and lecture notes | Teacher | Course-enrolled read; course teacher write |
| `material_chunks` | Extracted text chunks for future RAG/vector retrieval | Teacher/System | Course-enrolled read; course teacher write |
| `assignments` | Course assignments and homework | Teacher | Authenticated read; course teacher write |
| `submissions` | Student assignment work and teacher grades | Student/Teacher | Student & course teacher read; student submit |
| `assessments` | Quizzes, practice sets, diagnostic tests | Teacher | Authenticated read; course teacher write |
| `assessment_attempts` | Student quiz/diagnostic attempts and scores | Student/Teacher | Student & course teacher read; student submit |
| `concepts` | Granular knowledge graph concepts and prerequisites | Teacher/System | Authenticated read; course teacher write |
| `student_activity` | Behavioral signals (lesson completed, quiz started) | Student/AI | Student & course teacher read; student write |
| `learning_profiles` | Student mastery level and content preferences | Student/Teacher | Student & course teacher read/upsert |
| `learning_gaps` | Identified or AI-predicted knowledge deficits | Teacher/AI | Student & course teacher read; teacher write |
| `learning_paths` | Personalized remediation or advancement paths | Teacher/AI | Student & course teacher read; teacher write |
| `learning_path_items` | Specific sequence of steps within a learning path | Teacher/AI | Student & course teacher read; teacher write |
| `ai_recommendations` | Human-in-the-loop AI suggestions for teachers | AI / Teacher | Student/teacher read; teacher review/approve |
| `ai_decision_events` | Immutable audit trail explaining AI conclusions | System / Audit | Course teacher read; immutable write |
| `announcements` | Course-wide notices posted by teachers | Teacher | Authenticated read; course teacher write |
| `teacher_messages` | Direct messages from teacher to student | Teacher/Student | Sender & recipient read; teacher write |
| `student_messages` | Direct messages from student to teacher | Student/Teacher | Sender & recipient read; student write |
| `notifications` | System & activity alerts for users | Recipient | Recipient read/update/delete |

---

## 3. Entity Relationships

```
              ┌───────────────┐
              │     Users     │
              │(teacher/stud.)│
              └───────┬───────┘
                      │
         ┌────────────┴─────────────┐
         ▼                          ▼
  ┌─────────────┐            ┌──────────────┐
  │   Courses   │            │Notifications │
  │(teacherId)  │            └──────────────┘
  └──────┬──────┘
         │
         ├─────────────────────────────────────────┐
         ▼                                         ▼
  ┌──────────────┐                          ┌──────────────┐
  │CourseMembers │                          │  Materials   │
  │(studentId)   │                          └──────┬───────┘
  └──────────────┘                                 │
         │                                         ▼
         │                                  ┌──────────────┐
         │                                  │MaterialChunks│
         │                                  │ (RAG Ready)  │
         │                                  └──────────────┘
         ├──────────────────┬──────────────────────┐
         ▼                  ▼                      ▼
  ┌──────────────┐   ┌──────────────┐       ┌──────────────┐
  │ Assignments  │   │ Assessments  │       │   Concepts   │
  └──────┬───────┘   └──────┬───────┘       │(Knowledge Gr)│
         │                  │               └──────┬───────┘
         ▼                  ▼                      │
  ┌──────────────┐   ┌──────────────┐              │
  │ Submissions  │   │AssessmentAtt.│              │
  └──────────────┘   └──────────────┘              │
         │                                         │
         ▼                                         ▼
  ┌──────────────┐                          ┌──────────────┐
  │StudentActivi.│                          │ LearningGaps │
  └──────────────┘                          └──────┬───────┘
         │                                         │
         ▼                                         ▼
  ┌──────────────┐                          ┌──────────────┐
  │LearningProfil│◄─────────────────────────┤LearningPaths ├─► LearningPathItems
  └──────────────┘                          └──────────────┘
         ▲                                         ▲
         │                                         │
  ┌──────┴─────────────────────────────────────────┴──────┐
  │         AI Recommendations (Human-in-the-Loop)        │
  │         AI Decision Events (Explainable Audit)        │
  └───────────────────────────────────────────────────────┘
```

---

## 4. Key Architectural Guarantees

1. **Strict Type Safety**: All 20 models defined in `src/types/` and wired to Firestore with generic type converters via `makeConverter<T>()`.
2. **Runtime Validation**: Zod validation schemas in `src/lib/validation/` validate form inputs and API payloads before hitting the database.
3. **Repository Layer**: Consistent `DbResult<T>` returns `{ success: true, data: T } | { success: false, error: string }` across all services.
4. **Security Enforced**: `firestore.rules` enforces role-based access, teacher course ownership, student submission constraints, and immutable audit logs.
5. **Zero Client Role Escalation**: The `role` attribute in `users/{userId}` is strictly protected from updates from the client.
6. **Query Performance**: `firestore.indexes.json` indexes all composite multi-field queries.
7. **Lighthouse Preservation**: Zero bundle bloat, zero heavy third-party DB libraries, lightweight tree-shakable modular Firestore calls.
