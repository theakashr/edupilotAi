/**
 * src/services/learning/learningGapEngine.ts
 *
 * Phase 10: Evidence-Based Learning Gap Identification
 *
 * Traverses the knowledge graph to diagnose:
 * 1. Direct observed weaknesses (score < 60% with verified evidence).
 * 2. Prerequisite root-cause gaps (prerequisites of struggling concepts that are weak or unassessed).
 * 3. Automatic gap resolution and updating when new evidence arrives.
 * 4. Deduplication against existing active Firestore gaps.
 */

import type {
  Concept,
  ConceptMasteryEstimate,
  IdentifiedLearningGap,
  LearningGap,
  RiskLevel,
  StudentCourseMasteryProfile,
} from '@/types';
import { learningService } from './learningService';

export interface GapDiagnosisResult {
  gapsToCreate: IdentifiedLearningGap[];
  gapsToUpdate: Array<{ id: string; currentMastery: number; status: 'improving' | 'resolved' | 'open'; evidence: string[] }>;
  resolvedGapCount: number;
  activeGaps: IdentifiedLearningGap[];
}

/**
 * Diagnoses learning gaps deterministically using the knowledge graph and mastery estimates.
 */
export function diagnoseLearningGaps(
  concepts: Concept[],
  masteryProfile: StudentCourseMasteryProfile,
  existingGaps: LearningGap[] = []
): GapDiagnosisResult {
  const conceptMap = new Map<string, Concept>();
  for (const c of concepts) {
    conceptMap.set(c.id, c);
  }

  const existingGapByConceptId = new Map<string, LearningGap>();
  for (const g of existingGaps) {
    // Only track most recent or active gaps per concept
    if (g.status === 'open' || g.status === 'improving') {
      existingGapByConceptId.set(g.conceptId, g);
    }
  }

  const identifiedGaps: IdentifiedLearningGap[] = [];
  const gapsToCreate: IdentifiedLearningGap[] = [];
  const gapsToUpdate: Array<{ id: string; currentMastery: number; status: 'improving' | 'resolved' | 'open'; evidence: string[] }> = [];
  let resolvedGapCount = 0;

  // 1. Evaluate each concept's current mastery
  for (const concept of concepts) {
    const est: ConceptMasteryEstimate | undefined = masteryProfile.masteries[concept.id];
    if (!est) continue;

    const existingActiveGap = existingGapByConceptId.get(concept.id);

    // Case A: Concept is mastered (score >= 70% with verified evidence)
    if (est.status === 'demonstrated_understanding' && est.confidence !== 'insufficient') {
      if (existingActiveGap) {
        // Resolve previously open gap!
        gapsToUpdate.push({
          id: existingActiveGap.id,
          currentMastery: est.score,
          status: 'resolved',
          evidence: [
            ...est.evidence,
            `Mastery established at ${est.score}%. Gap successfully resolved.`,
          ],
        });
        resolvedGapCount++;
      }
      continue;
    }

    // Case B: Direct Observed Weakness (score < 60% with sufficient questions)
    if (est.status === 'potential_difficulty' && est.confidence !== 'insufficient') {
      let riskLevel: RiskLevel = 'medium';
      if (est.score < 40) {
        riskLevel = 'high';
      } else if (est.score >= 55) {
        riskLevel = 'low';
      }

      const evidence = [
        ...est.evidence,
        `Demonstrated score of ${est.score}% across ${est.evaluatedQuestions} evaluated questions.`,
      ];

      const gapData: IdentifiedLearningGap = {
        conceptId: concept.id,
        conceptName: concept.name,
        currentMastery: est.score,
        riskLevel,
        status: 'open',
        reason: `Demonstrated difficulty on '${concept.name}' with score ${est.score}%`,
        evidence,
        isPrerequisiteGap: false,
      };

      identifiedGaps.push(gapData);

      if (existingActiveGap) {
        // Update existing gap rather than creating duplicate
        gapsToUpdate.push({
          id: existingActiveGap.id,
          currentMastery: est.score,
          status: est.score > (existingActiveGap.currentMastery || 0) ? 'improving' : 'open',
          evidence,
        });
      } else {
        gapsToCreate.push(gapData);
      }

      // 2. Prerequisite Root-Cause Inspection
      // If the student is struggling with this concept, check if upstream prerequisites have issues!
      if (concept.prerequisiteConceptIds && concept.prerequisiteConceptIds.length > 0) {
        for (const prereqId of concept.prerequisiteConceptIds) {
          const prereqConcept = conceptMap.get(prereqId);
          if (!prereqConcept) continue;

          const prereqEst = masteryProfile.masteries[prereqId];
          const existingPrereqGap = existingGapByConceptId.get(prereqId);

          if (!prereqEst || prereqEst.status === 'not_assessed') {
            // Prerequisite has never been assessed!
            const prereqEvidence = [
              `Prerequisite '${prereqConcept.name}' has not been assessed.`,
              `Difficulty on downstream concept '${concept.name}' may stem from foundational gap.`,
            ];

            const prereqGapData: IdentifiedLearningGap = {
              conceptId: prereqConcept.id,
              conceptName: prereqConcept.name,
              currentMastery: 0,
              riskLevel: 'high',
              status: 'open',
              reason: `Unassessed prerequisite '${prereqConcept.name}' may be causing difficulty in '${concept.name}'`,
              evidence: prereqEvidence,
              isPrerequisiteGap: true,
              blockedConceptId: concept.id,
              blockedConceptName: concept.name,
              rootPrerequisiteConceptId: prereqConcept.id,
              rootPrerequisiteConceptName: prereqConcept.name,
            };

            // Avoid adding same prereq multiple times in this batch
            if (!identifiedGaps.some((g) => g.conceptId === prereqConcept.id)) {
              identifiedGaps.push(prereqGapData);
              if (existingPrereqGap) {
                gapsToUpdate.push({
                  id: existingPrereqGap.id,
                  currentMastery: 0,
                  status: 'open',
                  evidence: prereqEvidence,
                });
              } else {
                gapsToCreate.push(prereqGapData);
              }
            }
          } else if (
            prereqEst.status === 'potential_difficulty' ||
            (prereqEst.status === 'insufficient_evidence' && prereqEst.score < 60)
          ) {
            // Prerequisite is also weak or struggling!
            const prereqEvidence = [
              ...prereqEst.evidence,
              `Weak foundation in '${prereqConcept.name}' (score: ${prereqEst.score}%) directly impacts understanding of '${concept.name}'.`,
            ];

            const prereqGapData: IdentifiedLearningGap = {
              conceptId: prereqConcept.id,
              conceptName: prereqConcept.name,
              currentMastery: prereqEst.score,
              riskLevel: 'high',
              status: 'open',
              reason: `Foundational bottleneck in prerequisite '${prereqConcept.name}' blocking progress in '${concept.name}'`,
              evidence: prereqEvidence,
              isPrerequisiteGap: true,
              blockedConceptId: concept.id,
              blockedConceptName: concept.name,
              rootPrerequisiteConceptId: prereqConcept.id,
              rootPrerequisiteConceptName: prereqConcept.name,
            };

            if (!identifiedGaps.some((g) => g.conceptId === prereqConcept.id)) {
              identifiedGaps.push(prereqGapData);
              if (existingPrereqGap) {
                gapsToUpdate.push({
                  id: existingPrereqGap.id,
                  currentMastery: prereqEst.score,
                  status: 'open',
                  evidence: prereqEvidence,
                });
              } else {
                gapsToCreate.push(prereqGapData);
              }
            }
          }
        }
      }
    }
  }

  return {
    gapsToCreate,
    gapsToUpdate,
    resolvedGapCount,
    activeGaps: identifiedGaps,
  };
}

/**
 * Persists diagnosed gaps to Firestore, updating existing gaps and creating new ones idempotently.
 */
export async function syncGapsToFirestore(
  studentId: string,
  courseId: string,
  diagnosis: GapDiagnosisResult
): Promise<void> {
  // 1. Process updates (e.g. resolved or improved gaps)
  for (const upd of diagnosis.gapsToUpdate) {
    try {
      await learningService.updateLearningGap(upd.id, {
        currentMastery: upd.currentMastery,
        status: upd.status,
        evidence: upd.evidence,
      });
    } catch (err) {
      console.warn(`Failed to update learning gap ${upd.id}:`, err);
    }
  }

  // 2. Process creates (newly discovered gaps)
  for (const gap of diagnosis.gapsToCreate) {
    try {
      await learningService.createLearningGap({
        studentId,
        courseId,
        conceptId: gap.conceptId,
        currentMastery: gap.currentMastery,
        riskLevel: gap.riskLevel,
        predicted: false,
        reason: gap.reason,
        evidence: gap.evidence,
        status: gap.status,
      });
    } catch (err) {
      console.warn(`Failed to create learning gap for concept ${gap.conceptId}:`, err);
    }
  }
}
