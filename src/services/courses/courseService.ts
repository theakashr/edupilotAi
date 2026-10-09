import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import {
  courseCollection,
  courseMemberCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type {
  Course,
  CourseMember,
  CourseMemberStatus,
  DbResult,
} from '@/types';
import type {
  CreateCourseInput,
  UpdateCourseInput,
} from '@/lib/validation';

/**
 * Service handling all course and course-membership database operations.
 */
export const courseService = {
  /**
   * Create a new course.
   */
  async createCourse(input: CreateCourseInput): Promise<DbResult<Course>> {
    try {
      const colRef = courseCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newCourse: Course = {
        id: newDocRef.id,
        title: input.title,
        description: input.description,
        subject: input.subject,
        teacherId: input.teacherId,
        status: input.status,
        language: input.language,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newCourse);
      return { success: true, data: newCourse };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create course',
      };
    }
  },

  /**
   * Retrieve a course by ID.
   */
  async getCourseById(courseId: string): Promise<DbResult<Course | null>> {
    try {
      const docRef = typedDoc<Course>(COLLECTIONS.COURSES, courseId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve course',
      };
    }
  },

  /**
   * List courses created by a specific teacher.
   */
  async listTeacherCourses(
    teacherId: string,
    maxCount = 50
  ): Promise<DbResult<Course[]>> {
    try {
      try {
        const q = query(
          courseCollection(),
          where('teacherId', '==', teacherId),
          orderBy('createdAt', 'desc'),
          limit(maxCount)
        );

        const snapshot = await getDocs(q);
        const courses: Course[] = snapshot.docs.map((docSnap) => docSnap.data());
        return { success: true, data: courses };
      } catch (queryErr: unknown) {
        // Fallback for missing composite index (sort in-memory)
        const errMsg = queryErr instanceof Error ? queryErr.message : '';
        if (errMsg.includes('requires an index') || errMsg.includes('failed-precondition')) {
          const fallbackQuery = query(
            courseCollection(),
            where('teacherId', '==', teacherId),
            limit(maxCount)
          );
          const snapshot = await getDocs(fallbackQuery);
          const courses: Course[] = snapshot.docs
            .map((docSnap) => docSnap.data())
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
          return { success: true, data: courses };
        }
        throw queryErr;
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list teacher courses',
      };
    }
  },

  /**
   * Update an existing course.
   */
  async updateCourse(
    courseId: string,
    updates: UpdateCourseInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Course>(COLLECTIONS.COURSES, courseId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update course',
      };
    }
  },

  /**
   * Delete a course permanently.
   */
  async deleteCourse(courseId: string): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Course>(COLLECTIONS.COURSES, courseId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete course',
      };
    }
  },

  /**
   * Enroll a student into a course.
   */
  async enrollStudent(
    courseId: string,
    studentId: string
  ): Promise<DbResult<CourseMember>> {
    try {
      if (!courseId || !studentId) {
        return {
          success: false,
          error: 'Course ID and Student ID are both required for enrollment.',
        };
      }

      // Check existing enrollment
      const existingQuery = query(
        courseMemberCollection(),
        where('courseId', '==', courseId),
        where('studentId', '==', studentId)
      );
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        return {
          success: true,
          data: existingSnap.docs[0].data(),
        };
      }

      const colRef = courseMemberCollection();
      const newDocRef = doc(colRef);
      const newMember: CourseMember = {
        id: newDocRef.id,
        courseId,
        studentId,
        status: 'active',
        joinedAt: nowTimestamp(),
      };

      await setDoc(newDocRef, newMember);
      return { success: true, data: newMember };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to enroll student',
      };
    }
  },

  /**
   * List all course members for a course.
   */
  async listCourseMembers(
    courseId: string
  ): Promise<DbResult<CourseMember[]>> {
    try {
      const q = query(
        courseMemberCollection(),
        where('courseId', '==', courseId),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const members: CourseMember[] = snapshot.docs.map((d) => d.data());
      return { success: true, data: members };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list course members',
      };
    }
  },

  /**
   * List all courses that a student is actively enrolled in.
   * Supports both Firebase UID and optional readable Student ID (EDU-XXXXXXXX).
   * Actively enrolled students are permitted to view their course unless archived.
   */
  async listStudentCourses(
    studentId: string,
    alternateId?: string
  ): Promise<DbResult<Course[]>> {
    try {
      if (!studentId && !alternateId) {
        return { success: true, data: [] };
      }

      const primaryId = studentId || alternateId;
      if (!primaryId) {
        return { success: true, data: [] };
      }

      // 1. Fetch memberships for this student using single-field query to avoid index failures
      const memberQuery = query(
        courseMemberCollection(),
        where('studentId', '==', primaryId)
      );
      const memberSnap = await getDocs(memberQuery);
      let allDocs = [...memberSnap.docs];

      // Check alternateId if provided and distinct
      if (alternateId && alternateId !== primaryId) {
        try {
          const altQuery = query(
            courseMemberCollection(),
            where('studentId', '==', alternateId)
          );
          const altSnap = await getDocs(altQuery);
          allDocs = [...allDocs, ...altSnap.docs];
        } catch {
          // Ignore if security rules restrict alternate ID query
        }
      }

      // Filter active memberships in-memory and deduplicate course IDs
      const courseIds = Array.from(
        new Set(
          allDocs
            .map((d) => d.data())
            .filter((m) => m.status === 'active')
            .map((m) => m.courseId)
        )
      );

      if (courseIds.length === 0) {
        return { success: true, data: [] };
      }

      // 2. Fetch course documents
      // Actively enrolled students can access their enrolled courses unless archived
      const courses: Course[] = [];
      await Promise.all(
        courseIds.map(async (cid) => {
          try {
            const cDoc = await getDoc(typedDoc<Course>(COLLECTIONS.COURSES, cid));
            if (cDoc.exists()) {
              const cData = cDoc.data();
              if (cData.status !== 'archived') {
                courses.push(cData);
              }
            }
          } catch {
            // Ignore individual fetch errors
          }
        })
      );

      // Sort by creation date descending
      courses.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      return { success: true, data: courses };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list student courses',
      };
    }
  },

  /**
   * Update student enrollment status.
   */
  async updateCourseMemberStatus(
    memberId: string,
    status: CourseMemberStatus
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<CourseMember>(COLLECTIONS.COURSE_MEMBERS, memberId);
      await updateDoc(docRef, { status });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update member status',
      };
    }
  },

  /**
   * Remove a student from a course entirely (unenroll).
   */
  async removeCourseMember(memberId: string): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<CourseMember>(COLLECTIONS.COURSE_MEMBERS, memberId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to remove course member',
      };
    }
  },
};
