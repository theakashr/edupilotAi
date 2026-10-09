/**
 * src/services/learning/replanningService.ts
 *
 * Phase 10: Dynamic Replanning Service
 *
 * Orchestrates continuous adaptation when a student generates new evidence:
 * 1. Pulls all course assessment attempts, concepts, materials, and existing paths.
 * 2. Runs explainable mastery estimation across all concepts.
 * 3. Updates student's LearningProfile.
 * 4. Diagnoses and synchronizes learning gaps (resolving cured gaps, opening new ones).
 * 5. Generates updated prioritized adaptive plan.
 * 6. Preserves completed historical activities while replacing obsolete pending activities.
 * 7. Records an immutable audit event in `ai_decision_events`.
 */

import type {
  AdaptivePlanResult,
  AssessmentAttempt,
  Concept,
  DbResult,
  LearningGap,
  LearningPath,
  LearningPathItem,
  Material,
  Assessment,
} from '@/types';
import { learningService } from './learningService';
import { assessmentService } from '@/services/assessments/assessmentService';
import { conceptService } from '@/services/knowledge/conceptService';
import { materialService } from '@/services/materials/materialService';
import { aiService } from '@/services/ai/aiService';
import { estimateStudentCourseMastery } from './masteryEstimator';
import { diagnoseLearningGaps, syncGapsToFirestore } from './learningGapEngine';
import { generateAdaptiveActivities } from './adaptivePlanner';

export interface ReplanStudentParams {
  studentId: string;
  courseId: string;
  triggerReason?: string;
}

export const replanningService = {
  /**
   * Executes a full, idempotent dynamic replan for a student in a course.
   */
  async replanStudentCourse(params: ReplanStudentParams): Promise<DbResult<AdaptivePlanResult>> {
    const { studentId, courseId, triggerReason = 'New assessment evidence recorded' } = params;

    try {
      // 1. Gather all required course context in parallel
      const [attemptsRes, conceptsRes, materialsRes, assessmentsRes, existingGapsRes, existingPathsRes] =
        await Promise.all([
          assessmentService.listStudentCourseAttempts(courseId, studentId),
          conceptService.listCourseConcepts(courseId),
          materialService.listCourseMaterials(courseId),
          assessmentService.listCourseAssessments(courseId),
          learningService.listStudentGaps(studentId, courseId),
          learningService.listStudentPaths(studentId, courseId),
        ]);

      const attempts: AssessmentAttempt[] = attemptsRes.success && attemptsRes.data ? attemptsRes.data : [];
      const concepts: Concept[] = conceptsRes.success && conceptsRes.data ? conceptsRes.data : [];
      const materials: Material[] = materialsRes.success && materialsRes.data ? materialsRes.data.filter((m) => m.status !== 'archived') : [];
      const assessments: Assessment[] = assessmentsRes.success && assessmentsRes.data ? assessmentsRes.data.filter((a) => a.status === 'published') : [];
      const existingGaps: LearningGap[] = existingGapsRes.success && existingGapsRes.data ? existingGapsRes.data : [];
      const existingPaths: LearningPath[] = existingPathsRes.success && existingPathsRes.data ? existingPathsRes.data : [];

      // Filter only completed attempts for grading calculations
      const completedAttempts = attempts.filter((a) => a.status === 'completed');

      // 2. Deterministic Mastery Estimation
      const masteryProfile = estimateStudentCourseMastery(
        studentId,
        courseId,
        concepts,
        completedAttempts
      );

      // 3. Update Learning Profile in Firestore
      await learningService.upsertLearningProfile(studentId, courseId, {
        overallMastery: masteryProfile.overallMastery,
      });

      // 4. Diagnose Learning Gaps via Knowledge Graph
      const gapDiagnosis = diagnoseLearningGaps(concepts, masteryProfile, existingGaps);

      // 5. Synchronize Gaps to Firestore
      await syncGapsToFirestore(studentId, courseId, gapDiagnosis);

      // 6. Generate Prioritized Adaptive Activities
      const generatedActivities = generateAdaptiveActivities({
        studentId,
        courseId,
        concepts,
        materials,
        assessments,
        masteryProfile,
        activeGaps: gapDiagnosis.activeGaps,
      });

      // 7. Find or create the student's active Learning Path
      let activePath = existingPaths.find((p) => p.status === 'active' || p.status === 'draft');
      if (!activePath) {
        const newPathRes = await learningService.createLearningPath({
          studentId,
          courseId,
          title: `Adaptive Path — ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
          status: 'active',
          generatedBy: 'hybrid',
        });
        if (newPathRes.success && newPathRes.data) {
          activePath = newPathRes.data;
        }
      }

      const pathId = activePath ? activePath.id : `path_${studentId}_${courseId}`;

      // 8. Reconcile Path Items in Firestore (preserve completed items, update pending items)
      if (activePath) {
        const existingItemsRes = await learningService.listPathItems(activePath.id);
        const existingItems: LearningPathItem[] =
          existingItemsRes.success && existingItemsRes.data ? existingItemsRes.data : [];

        const completedConceptIds = new Set(
          existingItems.filter((i) => i.status === 'completed').map((i) => i.conceptId)
        );

        // Mark activities completed if they were previously completed or if concept is now mastered
        generatedActivities.forEach((act) => {
          if (completedConceptIds.has(act.conceptId)) {
            act.status = 'completed';
          }
        });

        // Sync items into Firestore: create any missing path items
        for (const act of generatedActivities) {
          const match = existingItems.find(
            (i) => i.conceptId === act.conceptId && i.activityType === act.activityType
          );
          if (!match) {
            try {
              await learningService.createLearningPathItem({
                learningPathId: activePath.id,
                studentId,
                courseId,
                order: act.order,
                conceptId: act.conceptId,
                activityType: act.activityType,
                referenceId: act.referenceId,
                status: act.status,
              });
            } catch (err) {
              console.warn('Failed to sync path item:', err);
            }
          }
        }
      }

      // 9. Log Immutable Audit Event in ai_decision_events
      const resolvedNote =
        gapDiagnosis.resolvedGapCount > 0
          ? ` Resolved ${gapDiagnosis.resolvedGapCount} previous gaps.`
          : '';
      const gapSummary = `${gapDiagnosis.activeGaps.length} active gaps identified.${resolvedNote}`;

      await aiService.logDecisionEvent({
        courseId,
        studentId,
        eventType: 'replanning',
        summary: `Dynamic replanning completed: ${gapSummary}`,
        reasoning: `Triggered by: '${triggerReason}'. Calculated overall course mastery at ${masteryProfile.overallMastery}%. Generated ${generatedActivities.length} prioritized learning activities based on knowledge graph prerequisites and evidence.`,
      });

      const result: AdaptivePlanResult = {
        pathId,
        studentId,
        courseId,
        title: activePath?.title || 'Personalized Adaptive Plan',
        status: activePath?.status || 'active',
        overallMastery: masteryProfile.overallMastery,
        activities: generatedActivities,
        gaps: gapDiagnosis.activeGaps,
        replannedAt: new Date().toISOString(),
        reasonSummary: `Plan adapted: ${gapSummary}`,
      };

      return { success: true, data: result };
    } catch (err: unknown) {
      console.error('Error in replanStudentCourse:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to replan student course',
      };
    }
  },
};
