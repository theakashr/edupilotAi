import { courseService } from './courseService';
import { materialService } from '../materials/materialService';
import { conceptService } from '../knowledge/conceptService';
import { conceptCandidateService } from '../knowledge/conceptCandidateService';
import { conceptSourceService } from '../knowledge/conceptSourceService';
import { getUserProfile } from '@/lib/firebase/firestore';

export interface CourseReadiness {
  isReady: boolean;
  enrollment: {
    status: 'enrolled' | 'not_enrolled';
    message: string;
  };
  materials: {
    status: 'none' | 'processing' | 'processed' | 'failed' | 'empty';
    message: string;
    count: number;
  };
  concepts: {
    status: 'none' | 'pending_review' | 'approved' | 'no_sources';
    message: string;
    approvedCount: number;
    pendingCount: number;
  };
  tutor: {
    status: 'ready' | 'waiting_review' | 'waiting_processing' | 'insufficient_evidence' | 'config_error';
    message: string;
  };
}

export const courseReadinessService = {
  async getCourseReadiness(courseId: string, studentUserId: string): Promise<CourseReadiness> {
    const readiness: CourseReadiness = {
      isReady: false,
      enrollment: { status: 'not_enrolled', message: 'Student is not enrolled.' },
      materials: { status: 'none', message: 'No materials available.', count: 0 },
      concepts: { status: 'none', message: 'No concept candidates generated.', approvedCount: 0, pendingCount: 0 },
      tutor: { status: 'config_error', message: 'Agnes API configuration or availability problem.' }
    };

    try {
      // 1. Enrollment
      const profile = await getUserProfile(studentUserId);
      const coursesRes = await courseService.listStudentCourses(studentUserId, profile?.studentId);
      const isEnrolled = coursesRes.success && coursesRes.data && coursesRes.data.some(c => c.id === courseId);
      
      if (isEnrolled) {
        readiness.enrollment = { status: 'enrolled', message: 'Student is enrolled.' };
      }

      // 2. Materials
      const matsRes = await materialService.listCourseMaterials(courseId);
      const materials = (matsRes.success && matsRes.data) ? matsRes.data.filter(m => m.status !== 'archived') : [];
      readiness.materials.count = materials.length;

      if (materials.length === 0) {
        readiness.materials.status = 'none';
        readiness.materials.message = 'No materials available.';
      } else if (materials.some(m => m.status === 'processing')) {
        readiness.materials.status = 'processing';
        readiness.materials.message = 'Processing in progress.';
      } else if (materials.some(m => m.status === 'ready' && m.chunkCount && m.chunkCount > 0)) {
        readiness.materials.status = 'processed';
        readiness.materials.message = 'Processed text is available.';
      } else if (materials.some(m => m.status === 'failed')) {
        readiness.materials.status = 'failed';
        readiness.materials.message = 'Processing failed.';
      } else {
        readiness.materials.status = 'empty';
        readiness.materials.message = 'No usable text was extracted.';
      }

      // 3. Concepts
      const candsRes = await conceptCandidateService.listCourseCandidates(courseId);
      const candidates = (candsRes.success && candsRes.data) ? candsRes.data : [];
      const pendingCount = candidates.filter(c => c.status === 'pending').length;

      const conceptsRes = await conceptService.listCourseConcepts(courseId);
      const approvedConcepts = (conceptsRes.success && conceptsRes.data) ? conceptsRes.data : [];
      const approvedCount = approvedConcepts.length;

      readiness.concepts.approvedCount = approvedCount;
      readiness.concepts.pendingCount = pendingCount;

      let hasValidSources = false;
      if (approvedCount > 0) {
        // Check if any approved concept has valid sources
        const sourcesRes = await conceptSourceService.listSourcesByCourse(courseId);
        hasValidSources = sourcesRes.success && sourcesRes.data && sourcesRes.data.length > 0;
        
        if (hasValidSources) {
          readiness.concepts.status = 'approved';
          readiness.concepts.message = 'Approved concepts available.';
        } else {
          readiness.concepts.status = 'no_sources';
          readiness.concepts.message = 'Approved concepts have no valid source references.';
        }
      } else if (pendingCount > 0) {
        readiness.concepts.status = 'pending_review';
        readiness.concepts.message = 'Candidates awaiting teacher review.';
      } else {
        readiness.concepts.status = 'none';
        readiness.concepts.message = 'No concept candidates generated.';
      }

      // 4. Tutor Availability
      const isAgnesConfigured = !!process.env.AGNES_API_KEY;

      if (!isAgnesConfigured) {
        readiness.tutor = { status: 'config_error', message: 'Agnes API configuration or availability problem.' };
      } else if (!hasValidSources) {
        readiness.tutor = { status: 'insufficient_evidence', message: 'Insufficient usable source evidence.' };
      } else if (readiness.materials.status === 'processing') {
        readiness.tutor = { status: 'waiting_processing', message: 'Waiting for material processing.' };
      } else if (readiness.concepts.status === 'pending_review') {
        readiness.tutor = { status: 'waiting_review', message: 'Waiting for teacher review.' };
      } else if (readiness.enrollment.status === 'enrolled' && readiness.concepts.status === 'approved') {
        readiness.tutor = { status: 'ready', message: 'Ready to answer course-grounded questions.' };
        readiness.isReady = true;
      }

      return readiness;
    } catch (err) {
      console.error('[CourseReadinessService] Error calculating readiness:', err);
      return readiness;
    }
  }
};
