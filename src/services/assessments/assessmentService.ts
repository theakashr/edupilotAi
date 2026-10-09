import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  doc,
} from 'firebase/firestore';
import {
  assignmentCollection,
  submissionCollection,
  assessmentCollection,
  assessmentAttemptCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp, toTimestamp } from '@/lib/firebase/timestamps';
import type {
  Assignment,
  Submission,
  Assessment,
  AssessmentAttempt,
  DbResult,
} from '@/types';
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  CreateSubmissionInput,
  GradeSubmissionInput,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  CreateAssessmentAttemptInput,
  CompleteAssessmentAttemptInput,
} from '@/lib/validation';

/**
 * Service managing assignments, submissions, assessments, and attempts.
 */
export const assessmentService = {
  // ─── Assignments ────────────────────────────────────────────────────────────

  /**
   * Create an assignment.
   */
  async createAssignment(
    input: CreateAssignmentInput
  ): Promise<DbResult<Assignment>> {
    try {
      const colRef = assignmentCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newAssignment: Assignment = {
        id: newDocRef.id,
        courseId: input.courseId,
        teacherId: input.teacherId,
        title: input.title,
        description: input.description,
        dueDate: toTimestamp(input.dueDate),
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newAssignment);
      return { success: true, data: newAssignment };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create assignment',
      };
    }
  },

  /**
   * Get assignment by ID.
   */
  async getAssignmentById(
    assignmentId: string
  ): Promise<DbResult<Assignment | null>> {
    try {
      const docRef = typedDoc<Assignment>(COLLECTIONS.ASSIGNMENTS, assignmentId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve assignment',
      };
    }
  },

  /**
   * List assignments for a course.
   */
  async listCourseAssignments(
    courseId: string
  ): Promise<DbResult<Assignment[]>> {
    try {
      const q = query(
        assignmentCollection(),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map((d) => d.data());
      return { success: true, data: assignments };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list assignments',
      };
    }
  },

  /**
   * Update an assignment.
   */
  async updateAssignment(
    assignmentId: string,
    updates: UpdateAssignmentInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Assignment>(COLLECTIONS.ASSIGNMENTS, assignmentId);
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: nowTimestamp(),
      };
      if (updates.dueDate) {
        updateData.dueDate = toTimestamp(updates.dueDate);
      }
      await updateDoc(docRef, updateData);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update assignment',
      };
    }
  },

  // ─── Submissions ───────────────────────────────────────────────────────────

  /**
   * Create a student submission.
   */
  async createSubmission(
    input: CreateSubmissionInput
  ): Promise<DbResult<Submission>> {
    try {
      const colRef = submissionCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newSubmission: Submission = {
        id: newDocRef.id,
        assignmentId: input.assignmentId,
        courseId: input.courseId,
        studentId: input.studentId,
        submittedAt: now,
        status: input.status,
      };

      await setDoc(newDocRef, newSubmission);
      return { success: true, data: newSubmission };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create submission',
      };
    }
  },

  /**
   * Grade a submission.
   */
  async gradeSubmission(
    submissionId: string,
    grading: GradeSubmissionInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Submission>(COLLECTIONS.SUBMISSIONS, submissionId);
      await updateDoc(docRef, {
        score: grading.score,
        feedback: grading.feedback,
        gradedBy: grading.gradedBy,
        gradedAt: nowTimestamp(),
        status: 'graded',
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to grade submission',
      };
    }
  },

  /**
   * List submissions for an assignment.
   */
  async listAssignmentSubmissions(
    assignmentId: string
  ): Promise<DbResult<Submission[]>> {
    try {
      const q = query(
        submissionCollection(),
        where('assignmentId', '==', assignmentId),
        orderBy('submittedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const submissions = snapshot.docs.map((d) => d.data());
      return { success: true, data: submissions };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list submissions',
      };
    }
  },

  // ─── Assessments ───────────────────────────────────────────────────────────

  /**
   * Create an assessment.
   */
  async createAssessment(
    input: CreateAssessmentInput
  ): Promise<DbResult<Assessment>> {
    try {
      const colRef = assessmentCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newAssessment: Assessment = {
        id: newDocRef.id,
        courseId: input.courseId,
        teacherId: input.teacherId,
        teacherName: input.teacherName,
        courseTitle: input.courseTitle,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        type: input.type,
        difficulty: input.difficulty,
        totalMarks: input.totalMarks,
        durationMinutes: input.durationMinutes,
        status: input.status,
        conceptIds: input.conceptIds || [],
        questions: (input.questions || []).map((q) => ({
          ...q,
          points: q.points || 1,
        })),
        feedbackSettings: input.feedbackSettings || {
          showCorrectAnswers: true,
          showExplanations: true,
        },
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newAssessment);
      return { success: true, data: newAssessment };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create assessment',
      };
    }
  },

  /**
   * Get assessment by ID.
   */
  async getAssessmentById(
    assessmentId: string
  ): Promise<DbResult<Assessment | null>> {
    try {
      const docRef = typedDoc<Assessment>(COLLECTIONS.ASSESSMENTS, assessmentId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve assessment',
      };
    }
  },

  /**
   * List assessments for a course.
   */
  async listCourseAssessments(
    courseId: string
  ): Promise<DbResult<Assessment[]>> {
    try {
      const q = query(
        assessmentCollection(),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const assessments = snapshot.docs.map((d) => d.data());
      return { success: true, data: assessments };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list assessments',
      };
    }
  },

  /**
   * List all assessments created by a teacher.
   */
  async listTeacherAssessments(
    teacherId: string
  ): Promise<DbResult<Assessment[]>> {
    try {
      const q = query(
        assessmentCollection(),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const assessments = snapshot.docs.map((d) => d.data());
      return { success: true, data: assessments };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list teacher assessments',
      };
    }
  },

  /**
   * Update an assessment.
   */
  async updateAssessment(
    assessmentId: string,
    updates: UpdateAssessmentInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Assessment>(COLLECTIONS.ASSESSMENTS, assessmentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update assessment',
      };
    }
  },

  /**
   * Delete an assessment.
   */
  async deleteAssessment(
    assessmentId: string
  ): Promise<DbResult<void>> {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const docRef = typedDoc<Assessment>(COLLECTIONS.ASSESSMENTS, assessmentId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete assessment',
      };
    }
  },

  // ─── Assessment Attempts ───────────────────────────────────────────────────

  /**
   * Start a new assessment attempt.
   */
  async startAssessmentAttempt(
    input: CreateAssessmentAttemptInput
  ): Promise<DbResult<AssessmentAttempt>> {
    try {
      const colRef = assessmentAttemptCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newAttempt: AssessmentAttempt = {
        id: newDocRef.id,
        assessmentId: input.assessmentId,
        courseId: input.courseId,
        studentId: input.studentId,
        studentName: input.studentName,
        studentEmail: input.studentEmail,
        startedAt: now,
        status: input.status,
        createdAt: now,
      };

      await setDoc(newDocRef, newAttempt);
      return { success: true, data: newAttempt };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to start attempt',
      };
    }
  },

  /**
   * Complete an assessment attempt.
   */
  async completeAssessmentAttempt(
    attemptId: string,
    data: CompleteAssessmentAttemptInput & {
      results?: import('@/types').QuestionAttemptResult[];
      conceptBreakdown?: import('@/types').ConceptDiagnosticSummary[];
    }
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<AssessmentAttempt>(
        COLLECTIONS.ASSESSMENT_ATTEMPTS,
        attemptId
      );
      await updateDoc(docRef, {
        score: data.score,
        totalMarks: data.totalMarks,
        percentage: data.percentage,
        status: 'completed',
        answers: data.answers || {},
        results: data.results || [],
        conceptBreakdown: data.conceptBreakdown || [],
        submittedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to complete attempt',
      };
    }
  },

  /**
   * List attempts by student for an assessment.
   */
  async listStudentAttempts(
    assessmentId: string,
    studentId: string
  ): Promise<DbResult<AssessmentAttempt[]>> {
    try {
      const q = query(
        assessmentAttemptCollection(),
        where('assessmentId', '==', assessmentId),
        where('studentId', '==', studentId),
        orderBy('startedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const attempts = snapshot.docs.map((d) => d.data());
      return { success: true, data: attempts };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list student attempts',
      };
    }
  },

  /**
   * List all attempts for a given assessment (for teacher analysis).
   */
  async listAssessmentAttempts(
    assessmentId: string
  ): Promise<DbResult<AssessmentAttempt[]>> {
    try {
      const q = query(
        assessmentAttemptCollection(),
        where('assessmentId', '==', assessmentId),
        orderBy('startedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const attempts = snapshot.docs.map((d) => d.data());
      return { success: true, data: attempts };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list assessment attempts',
      };
    }
  },

  /**
   * List all attempts for a student in a course.
   */
  async listStudentCourseAttempts(
    courseId: string,
    studentId: string
  ): Promise<DbResult<AssessmentAttempt[]>> {
    try {
      const q = query(
        assessmentAttemptCollection(),
        where('courseId', '==', courseId),
        where('studentId', '==', studentId),
        orderBy('startedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const attempts = snapshot.docs.map((d) => d.data());
      return { success: true, data: attempts };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list student course attempts',
      };
    }
  },

  /**
   * List all attempts across an entire course (for teacher analytics and class-level insights).
   */
  async listCourseAttempts(
    courseId: string
  ): Promise<DbResult<AssessmentAttempt[]>> {
    try {
      const q = query(
        assessmentAttemptCollection(),
        where('courseId', '==', courseId),
        orderBy('startedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const attempts = snapshot.docs.map((d) => d.data());
      return { success: true, data: attempts };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list course attempts',
      };
    }
  },

  /**
   * Deterministic server-side grading engine.
   * Compares student answers against authoritative assessment questions.
   * Generates question-level results and concept diagnostic profiles.
   */
  gradeAssessmentSubmission(
    assessment: Assessment,
    answers: Record<string, number>
  ): {
    score: number;
    totalMarks: number;
    percentage: number;
    results: import('@/types').QuestionAttemptResult[];
    conceptBreakdown: import('@/types').ConceptDiagnosticSummary[];
  } {
    const questions = assessment.questions || [];
    let score = 0;
    let totalMarks = 0;

    const showCorrect = assessment.feedbackSettings?.showCorrectAnswers !== false;
    const showExplanation = assessment.feedbackSettings?.showExplanations !== false;

    // Track concept stats: conceptId -> { name, total, correct }
    const conceptMap: Record<
      string,
      { id: string; name: string; total: number; correct: number }
    > = {};

    // Register all assessment concepts so unassessed concepts can be identified
    (assessment.conceptIds || []).forEach((cId) => {
      if (!conceptMap[cId]) {
        conceptMap[cId] = {
          id: cId,
          name: cId,
          total: 0,
          correct: 0,
        };
      }
    });

    const results: import('@/types').QuestionAttemptResult[] = questions.map((q) => {
      const pointsPossible = q.points || 1;
      totalMarks += pointsPossible;

      const selectedIndex = answers[q.id] !== undefined ? answers[q.id] : null;
      const isCorrect = selectedIndex !== null && selectedIndex === q.correctOptionIndex;
      const pointsAwarded = isCorrect ? pointsPossible : 0;
      score += pointsAwarded;

      // Concept tracking
      if (q.conceptId) {
        if (!conceptMap[q.conceptId]) {
          conceptMap[q.conceptId] = {
            id: q.conceptId,
            name: q.conceptName || q.conceptId,
            total: 0,
            correct: 0,
          };
        }
        if (q.conceptName) {
          conceptMap[q.conceptId].name = q.conceptName;
        }
        conceptMap[q.conceptId].total += 1;
        if (isCorrect) {
          conceptMap[q.conceptId].correct += 1;
        }
      }

      return {
        questionId: q.id,
        questionText: q.text,
        options: q.options,
        selectedOptionIndex: selectedIndex,
        isCorrect,
        correctOptionIndex: showCorrect ? q.correctOptionIndex : undefined,
        explanation: showExplanation ? q.explanation : undefined,
        pointsAwarded,
        pointsPossible,
        conceptId: q.conceptId,
        conceptName: q.conceptName,
      };
    });

    // If assessment configured a fixed totalMarks, honor it as denominator if questions match
    const finalTotalMarks = totalMarks > 0 ? totalMarks : assessment.totalMarks || 1;
    const percentage = Math.min(100, Math.round((score / finalTotalMarks) * 100));

    // Calculate concept diagnostic breakdown per Section 5 guidelines
    const conceptBreakdown: import('@/types').ConceptDiagnosticSummary[] = Object.values(
      conceptMap
    ).map((c) => {
      const questionsCount = c.total;
      const correctCount = c.correct;
      const scorePct = questionsCount > 0 ? Math.round((correctCount / questionsCount) * 100) : 0;

      let status: import('@/types').ConceptDiagnosticStatus;
      let details: string;

      if (questionsCount === 0) {
        status = 'not_assessed';
        details = 'Concept was not covered in this assessment.';
      } else if (questionsCount === 1) {
        status = 'insufficient_evidence';
        details = `Only 1 question assessed (${correctCount}/1). Insufficient evidence to establish definitive mastery or difficulty.`;
      } else if (scorePct >= 70) {
        status = 'demonstrated_understanding';
        details = `Strong performance: ${correctCount}/${questionsCount} questions correct (${scorePct}%).`;
      } else if (scorePct < 60) {
        status = 'potential_difficulty';
        details = `Potential area for review: ${correctCount}/${questionsCount} questions correct (${scorePct}%).`;
      } else {
        status = 'insufficient_evidence';
        details = `Moderate performance: ${correctCount}/${questionsCount} questions correct (${scorePct}%). Further practice advised.`;
      }

      return {
        conceptId: c.id,
        conceptName: c.name,
        questionsCount,
        correctCount,
        scorePercentage: scorePct,
        status,
        details,
      };
    });

    return {
      score,
      totalMarks: finalTotalMarks,
      percentage,
      results,
      conceptBreakdown,
    };
  },
};
