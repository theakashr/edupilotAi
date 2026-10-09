import { z } from 'zod';

// ─── Reusable Common Schemas ─────────────────────────────────────────────────

export const idSchema = z.string().min(1, 'ID is required');
export const courseIdSchema = z.string().min(1, 'Course ID is required');
export const studentIdSchema = z.string().min(1, 'Student ID is required');
export const teacherIdSchema = z.string().min(1, 'Teacher ID is required');

// ─── Courses & Members ───────────────────────────────────────────────────────

export const courseStatusSchema = z.enum(['draft', 'active', 'archived']);
export const courseMemberStatusSchema = z.enum(['active', 'inactive']);

export const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters'),
  subject: z.string().min(2, 'Subject is required').max(60),
  teacherId: teacherIdSchema,
  status: courseStatusSchema.default('draft'),
  language: z.string().min(2).max(10).default('en'),
});

export const updateCourseSchema = createCourseSchema.partial().omit({ teacherId: true });

export const enrollStudentSchema = z.object({
  courseId: courseIdSchema,
  studentId: studentIdSchema,
  status: courseMemberStatusSchema.default('active'),
});

export const updateCourseMemberSchema = z.object({
  status: courseMemberStatusSchema,
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
export type UpdateCourseMemberInput = z.infer<typeof updateCourseMemberSchema>;

// ─── Materials & Chunks ─────────────────────────────────────────────────────

export const materialTypeSchema = z.enum(['pdf', 'ppt', 'document', 'note', 'other']);
export const materialStatusSchema = z.enum(['uploaded', 'processing', 'ready', 'failed', 'archived']);

export const createMaterialSchema = z.object({
  courseId: courseIdSchema,
  uploadedBy: teacherIdSchema,
  title: z.string().min(2, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  type: materialTypeSchema,
  storagePath: z.string().min(1, 'Storage path is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
  status: materialStatusSchema.default('uploaded'),
  version: z.number().int().min(1).default(1),
  storageProvider: z.literal('supabase').default('supabase').optional(),
  pageCount: z.number().int().nonnegative().optional(),
  chunkCount: z.number().int().nonnegative().optional(),
  processingError: z.string().max(2000).optional(),
});

export const updateMaterialSchema = createMaterialSchema.partial().omit({
  courseId: true,
  uploadedBy: true,
  storagePath: true,
});

export const createMaterialChunkSchema = z.object({
  materialId: idSchema,
  courseId: courseIdSchema,
  chunkIndex: z.number().int().nonnegative(),
  text: z.string().min(1, 'Text content is required'),
  pageNumber: z.number().int().positive().optional(),
  sectionTitle: z.string().max(200).optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateMaterialChunkInput = z.infer<typeof createMaterialChunkSchema>;

// ─── Assignments & Submissions ───────────────────────────────────────────────

export const assignmentStatusSchema = z.enum(['draft', 'published', 'closed']);
export const submissionStatusSchema = z.enum(['submitted', 'late', 'graded']);

export const createAssignmentSchema = z.object({
  courseId: courseIdSchema,
  teacherId: teacherIdSchema,
  title: z.string().min(3, 'Title is required').max(150),
  description: z.string().min(10, 'Description is required').max(5000),
  dueDate: z.date({ error: 'Due date is required' }),
  status: assignmentStatusSchema.default('draft'),
});

export const updateAssignmentSchema = createAssignmentSchema.partial().omit({
  courseId: true,
  teacherId: true,
});

export const createSubmissionSchema = z.object({
  assignmentId: idSchema,
  courseId: courseIdSchema,
  studentId: studentIdSchema,
  status: submissionStatusSchema.default('submitted'),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100'),
  feedback: z.string().max(2000).optional(),
  gradedBy: teacherIdSchema,
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

// ─── Assessments & Attempts ─────────────────────────────────────────────────

export const assessmentTypeSchema = z.enum(['diagnostic', 'quiz', 'practice', 'exam']);
export const assessmentDifficultySchema = z.enum(['easy', 'medium', 'hard', 'mixed']);
export const assessmentStatusSchema = z.enum(['draft', 'published', 'closed']);
export const attemptStatusSchema = z.enum(['in_progress', 'completed']);

export const createAssessmentSchema = z.object({
  courseId: courseIdSchema,
  teacherId: teacherIdSchema,
  title: z.string().min(3).max(150),
  description: z.string().max(1000).optional(),
  type: assessmentTypeSchema,
  difficulty: assessmentDifficultySchema,
  totalMarks: z.number().positive('Total marks must be positive'),
  status: assessmentStatusSchema.default('draft'),
});

export const updateAssessmentSchema = createAssessmentSchema.partial().omit({
  courseId: true,
  teacherId: true,
});

export const createAssessmentAttemptSchema = z.object({
  assessmentId: idSchema,
  courseId: courseIdSchema,
  studentId: studentIdSchema,
  status: attemptStatusSchema.default('in_progress'),
});

export const completeAssessmentAttemptSchema = z.object({
  score: z.number().min(0),
  percentage: z.number().min(0).max(100),
  status: z.literal('completed'),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type CreateAssessmentAttemptInput = z.infer<typeof createAssessmentAttemptSchema>;
export type CompleteAssessmentAttemptInput = z.infer<typeof completeAssessmentAttemptSchema>;

// ─── Learning Intelligence ───────────────────────────────────────────────────

export const activityTypeSchema = z.enum([
  'lesson_started',
  'lesson_completed',
  'quiz_started',
  'quiz_completed',
  'assignment_submitted',
  'material_viewed',
  'question_asked',
]);

export const riskLevelSchema = z.enum(['low', 'medium', 'high']);
export const gapStatusSchema = z.enum(['open', 'improving', 'resolved']);
export const learningPathStatusSchema = z.enum(['draft', 'active', 'completed', 'paused']);
export const learningPathGeneratorSchema = z.enum(['teacher', 'ai', 'hybrid']);
export const learningPathItemActivitySchema = z.enum(['lesson', 'practice', 'quiz', 'revision', 'assignment']);
export const learningPathItemStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'skipped']);

// ─── Knowledge & Concept Mapping Schemas ───────────────────────────────────
export const conceptRelationshipTypeSchema = z.enum(['prerequisite', 'related', 'part_of']);
export const candidateStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const createConceptRelationshipSchema = z
  .object({
    courseId: courseIdSchema,
    sourceConceptId: idSchema,
    targetConceptId: idSchema,
    type: conceptRelationshipTypeSchema,
    description: z.string().max(500).optional(),
  })
  .refine((data) => data.sourceConceptId !== data.targetConceptId, {
    message: 'A concept cannot relate to itself',
    path: ['targetConceptId'],
  });

export const createConceptCandidateSchema = z.object({
  courseId: courseIdSchema,
  materialId: idSchema,
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  sourceChunkIds: z.array(z.string()).default([]),
  sourcePages: z.array(z.number().int().positive()).default([]),
  relevanceScore: z.number().min(0).max(100).default(50),
  scoringSignals: z.array(z.string()).default([]),
  duplicateOfConceptId: z.string().optional(),
});

export const reviewCandidateSchema = z.object({
  candidateId: idSchema,
  status: z.enum(['approved', 'rejected']),
  customName: z.string().min(2).max(100).optional(),
  customDescription: z.string().max(1000).optional(),
  customDifficulty: z.number().min(1).max(10).optional(),
});

export const createConceptSourceSchema = z.object({
  conceptId: idSchema,
  courseId: courseIdSchema,
  materialId: idSchema,
  materialChunkId: idSchema,
  pageNumber: z.number().int().positive().optional(),
  evidenceText: z.string().max(500).optional(),
});

export const createLearningObjectiveSchema = z.object({
  courseId: courseIdSchema,
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  conceptIds: z.array(z.string()).default([]),
  materialIds: z.array(z.string()).default([]),
});

export const updateLearningObjectiveSchema = createLearningObjectiveSchema
  .partial()
  .omit({ courseId: true });

export const createConceptSchema = z.object({
  courseId: courseIdSchema,
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  difficulty: z.number().min(1).max(10).optional(),
  prerequisiteConceptIds: z.array(z.string()).optional(),
  materialIds: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const updateConceptSchema = createConceptSchema.partial().omit({ courseId: true });

export const createStudentActivitySchema = z.object({
  studentId: studentIdSchema,
  courseId: courseIdSchema,
  activityType: activityTypeSchema,
  referenceId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateLearningProfileSchema = z.object({
  preferredLanguage: z.string().max(10).optional(),
  learningPreferences: z
    .object({
      preferredContentType: z.string().optional(),
      preferredDifficulty: z.string().optional(),
    })
    .optional(),
  overallMastery: z.number().min(0).max(100).optional(),
});

export const createLearningGapSchema = z.object({
  studentId: studentIdSchema,
  courseId: courseIdSchema,
  conceptId: idSchema,
  currentMastery: z.number().min(0).max(100).optional(),
  riskLevel: riskLevelSchema,
  predicted: z.boolean().default(false),
  reason: z.string().max(500).optional(),
  evidence: z.array(z.string()).optional(),
  status: gapStatusSchema.default('open'),
});

export const updateLearningGapSchema = z.object({
  currentMastery: z.number().min(0).max(100).optional(),
  riskLevel: riskLevelSchema.optional(),
  status: gapStatusSchema.optional(),
  reason: z.string().max(500).optional(),
  evidence: z.array(z.string()).optional(),
});

export const createLearningPathSchema = z.object({
  studentId: studentIdSchema,
  courseId: courseIdSchema,
  title: z.string().min(3).max(120),
  status: learningPathStatusSchema.default('draft'),
  generatedBy: learningPathGeneratorSchema.default('teacher'),
});

export const updateLearningPathSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  status: learningPathStatusSchema.optional(),
});

export const createLearningPathItemSchema = z.object({
  learningPathId: idSchema,
  studentId: studentIdSchema,
  courseId: courseIdSchema,
  order: z.number().int().nonnegative(),
  conceptId: z.string().optional(),
  activityType: learningPathItemActivitySchema,
  referenceId: z.string().optional(),
  status: learningPathItemStatusSchema.default('pending'),
});

export const updateLearningPathItemSchema = z.object({
  order: z.number().int().nonnegative().optional(),
  status: learningPathItemStatusSchema.optional(),
});

export type CreateConceptRelationshipInput = z.infer<typeof createConceptRelationshipSchema>;
export type CreateConceptCandidateInput = z.infer<typeof createConceptCandidateSchema>;
export type ReviewCandidateInput = z.infer<typeof reviewCandidateSchema>;
export type CreateConceptSourceInput = z.infer<typeof createConceptSourceSchema>;
export type CreateLearningObjectiveInput = z.infer<typeof createLearningObjectiveSchema>;
export type UpdateLearningObjectiveInput = z.infer<typeof updateLearningObjectiveSchema>;
export type CreateConceptInput = z.infer<typeof createConceptSchema>;
export type UpdateConceptInput = z.infer<typeof updateConceptSchema>;
export type CreateStudentActivityInput = z.infer<typeof createStudentActivitySchema>;
export type UpdateLearningProfileInput = z.infer<typeof updateLearningProfileSchema>;
export type CreateLearningGapInput = z.infer<typeof createLearningGapSchema>;
export type UpdateLearningGapInput = z.infer<typeof updateLearningGapSchema>;
export type CreateLearningPathInput = z.infer<typeof createLearningPathSchema>;
export type UpdateLearningPathInput = z.infer<typeof updateLearningPathSchema>;
export type CreateLearningPathItemInput = z.infer<typeof createLearningPathItemSchema>;
export type UpdateLearningPathItemInput = z.infer<typeof updateLearningPathItemSchema>;

// ─── Communication ───────────────────────────────────────────────────────────

export const announcementTargetSchema = z.enum(['course', 'students']);
export const notificationTypeSchema = z.enum([
  'announcement',
  'assignment',
  'assessment',
  'feedback',
  'learning',
  'system',
]);

export const createAnnouncementSchema = z.object({
  courseId: courseIdSchema,
  teacherId: teacherIdSchema,
  title: z.string().min(3).max(150),
  message: z.string().min(5).max(3000),
  target: announcementTargetSchema.default('course'),
  isPublished: z.boolean().default(true),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().omit({
  courseId: true,
  teacherId: true,
});

export const createDirectMessageSchema = z.object({
  courseId: courseIdSchema,
  message: z.string().min(1, 'Message cannot be empty').max(2000),
});

export const createNotificationSchema = z.object({
  recipientId: idSchema,
  type: notificationTypeSchema,
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(500),
  referenceId: z.string().optional(),
  isRead: z.boolean().default(false),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type CreateDirectMessageInput = z.infer<typeof createDirectMessageSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

// ─── AI Foundation ───────────────────────────────────────────────────────────

export const recommendationTypeSchema = z.enum(['learning', 'intervention', 'assessment', 'resource', 'replanning']);
export const recommendationPrioritySchema = z.enum(['low', 'medium', 'high']);
export const recommendationStatusSchema = z.enum(['pending', 'approved', 'rejected', 'executed']);
export const aiEventTypeSchema = z.enum([
  'recommendation',
  'prediction',
  'replanning',
  'source_conflict',
  'teacher_override',
  'analysis',
  'explanation',
]);


export const createAIRecommendationSchema = z.object({
  courseId: courseIdSchema,
  studentId: z.string().optional(),
  type: recommendationTypeSchema,
  title: z.string().min(3).max(150),
  explanation: z.string().min(10).max(2000),
  priority: recommendationPrioritySchema,
  status: recommendationStatusSchema.default('pending'),
  createdBy: z.literal('ai').default('ai'),
});

export const updateAIRecommendationStatusSchema = z.object({
  status: recommendationStatusSchema,
  reviewedBy: teacherIdSchema,
});

export const createAIDecisionEventSchema = z.object({
  courseId: courseIdSchema,
  studentId: z.string().optional(),
  eventType: aiEventTypeSchema,
  summary: z.string().min(5).max(250),
  reasoning: z.string().max(2000).optional(),
});

export type CreateAIRecommendationInput = z.infer<typeof createAIRecommendationSchema>;
export type UpdateAIRecommendationStatusInput = z.infer<typeof updateAIRecommendationStatusSchema>;
export type CreateAIDecisionEventInput = z.infer<typeof createAIDecisionEventSchema>;

// ─── Phase 8: Source Trust & Conflict Resolution ─────────────────────────────

export const trustTierSchema = z.enum(['primary', 'secondary', 'reference']);
export const conflictStatusSchema = z.enum(['pending', 'accepted', 'dismissed', 'needs_revision']);

/**
 * Input for creating or updating a source trust profile on a material.
 */
export const createSourceProfileSchema = z.object({
  courseId: courseIdSchema,
  materialId: idSchema,
  /** Denormalized material title for display without extra lookups. */
  materialTitle: z.string().min(1).max(200),
  trustTier: trustTierSchema,
  rationale: z.string().max(500).optional(),
  setBy: teacherIdSchema,
});

export const updateSourceProfileSchema = z.object({
  trustTier: trustTierSchema.optional(),
  rationale: z.string().max(500).optional(),
});

/**
 * Input for triggering AI conflict detection between two material chunks.
 */
export const analyzeConflictSchema = z.object({
  courseId: courseIdSchema,
  materialIdA: idSchema,
  chunkIdA: idSchema,
  materialIdB: idSchema,
  chunkIdB: idSchema,
  /** Optional concept these chunks relate to. */
  conceptId: z.string().optional(),
  conceptName: z.string().max(100).optional(),
  language: z.string().min(2).max(10).default('en'),
  userId: teacherIdSchema,
});

/**
 * Input for a teacher resolving a detected conflict.
 * AI cannot resolve its own conflicts — this is exclusively a teacher action.
 */
export const resolveConflictSchema = z
  .object({
    status: z.enum(['accepted', 'dismissed', 'needs_revision']),
    resolution: z.string().min(5, 'Resolution note is required').max(2000),
    /**
     * Only required when status === 'accepted'.
     * null = teacher found both acceptable or neither fully correct.
     */
    trustedMaterialId: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'accepted' && data.trustedMaterialId === undefined) {
        return false;
      }
      return true;
    },
    {
      message: "trustedMaterialId must be provided (or null) when status is 'accepted'",
      path: ['trustedMaterialId'],
    }
  );

export type CreateSourceProfileInput = z.infer<typeof createSourceProfileSchema>;
export type UpdateSourceProfileInput = z.infer<typeof updateSourceProfileSchema>;
export type AnalyzeConflictInput = z.infer<typeof analyzeConflictSchema>;
export type ResolveConflictInput = z.infer<typeof resolveConflictSchema>;

