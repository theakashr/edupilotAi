/**
 * src/services/learning/predictionEngine.ts
 *
 * Phase 11: Learning Gap Prediction & Early-Warning Engine
 *
 * Predicts potential future learning difficulties deterministically by traversing
 * the knowledge graph forward from known weaknesses.
 */

import type {
  Concept,
  ConceptMasteryEstimate,
  IdentifiedLearningGap,
  RiskLevel,
  StudentCourseMasteryProfile,
} from '@/types';

export interface PredictionResult {
  predictedGaps: IdentifiedLearningGap[];
}

/**
 * Predicts learning gaps for unassessed or upcoming concepts based on prerequisite mastery.
 */
export function predictLearningGaps(
  concepts: Concept[],
  masteryProfile: StudentCourseMasteryProfile
): PredictionResult {
  const conceptMap = new Map<string, Concept>();
  const dependentMap = new Map<string, string[]>();

  // 1. Build the graph (concept map and dependent map)
  for (const c of concepts) {
    conceptMap.set(c.id, c);
    if (c.prerequisiteConceptIds) {
      for (const prereqId of c.prerequisiteConceptIds) {
        if (!dependentMap.has(prereqId)) {
          dependentMap.set(prereqId, []);
        }
        dependentMap.get(prereqId)!.push(c.id);
      }
    }
  }

  const predictedGaps: IdentifiedLearningGap[] = [];
  const predictedConceptIds = new Set<string>();

  // Helper to traverse and predict downstream recursively
  function traverseAndPredict(
    prereqConcept: Concept,
    prereqEst: ConceptMasteryEstimate,
    currentConceptId: string
  ) {
    const concept = conceptMap.get(currentConceptId);
    if (!concept) return;

    const est = masteryProfile.masteries[currentConceptId];

    // If the concept is already assessed (either mastered or observed gap), we don't predict it.
    // We only predict for concepts that are unassessed or have insufficient evidence.
    if (
      !est ||
      est.status === 'not_assessed' ||
      (est.status === 'insufficient_evidence' && est.evaluatedQuestions === 0)
    ) {
      if (!predictedConceptIds.has(concept.id)) {
        // Calculate risk level based on how weak the prerequisite is
        let riskLevel: RiskLevel = 'medium';
        if (prereqEst.score < 40) {
          riskLevel = 'high';
        }

        const evidence = [
          `Foundational prerequisite '${prereqConcept.name}' has low mastery (${prereqEst.score}%).`,
          `Student has not yet been assessed on '${concept.name}'.`,
          `High probability of struggle due to direct dependency.`,
        ];

        predictedGaps.push({
          conceptId: concept.id,
          conceptName: concept.name,
          currentMastery: 0,
          riskLevel,
          status: 'open',
          reason: `Predicted difficulty because prerequisite '${prereqConcept.name}' mastery is weak (${prereqEst.score}%).`,
          evidence,
          isPrerequisiteGap: false,
          predicted: true,
          rootPrerequisiteConceptId: prereqConcept.id,
          rootPrerequisiteConceptName: prereqConcept.name,
        });

        predictedConceptIds.add(concept.id);

        // Traverse further downstream (transitive gaps)
        const furtherDependents = dependentMap.get(concept.id) || [];
        for (const depId of furtherDependents) {
          traverseAndPredict(prereqConcept, prereqEst, depId);
        }
      }
    }
  }

  // 2. Find weak prerequisites and predict downstream impact
  for (const concept of concepts) {
    const est = masteryProfile.masteries[concept.id];
    
    // Only use concepts where we have a confirmed weakness
    if (
      est &&
      (est.status === 'potential_difficulty' || (est.status === 'insufficient_evidence' && est.score < 60 && est.evaluatedQuestions > 0)) &&
      est.confidence !== 'insufficient'
    ) {
      const dependents = dependentMap.get(concept.id) || [];
      for (const dependentId of dependents) {
        traverseAndPredict(concept, est, dependentId);
      }
    }
  }

  return {
    predictedGaps,
  };
}
