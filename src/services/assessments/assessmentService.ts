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
        title: input.title,
        description: input.description,
        type: input.type,
        difficulty: input.difficulty,
        totalMarks: input.totalMarks,
        status: input.status,
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
    data: CompleteAssessmentAttemptInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<AssessmentAttempt>(
        COLLECTIONS.ASSESSMENT_ATTEMPTS,
        attemptId
      );
      await updateDoc(docRef, {
        score: data.score,
        percentage: data.percentage,
        status: 'completed',
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
};
