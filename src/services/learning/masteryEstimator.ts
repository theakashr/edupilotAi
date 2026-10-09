/**
 * src/services/learning/masteryEstimator.ts
 *
 * Phase 10: Explainable Mastery Estimator
 *
 * Calculates deterministic concept-level mastery scores from verified assessment attempts.
 *
 * Assumptions & Design Rules:
 * 1. Confidence Scaling: At least 2 questions are required to establish evidence.
 *    - 0 questions = not_assessed (insufficient confidence)
 *    - 1 question = insufficient_evidence (insufficient confidence; 1 wrong/right answer is never definitive)
 *    - 2 questions = low confidence
 *    - 3–4 questions = moderate confidence
 *    - 5+ questions = high confidence
 * 2. Recency Weighting:
 *    - When a student completes multiple assessment attempts over time, more recent attempts
 *      reflect current knowledge state more accurately than older attempts.
 *    - Attempt recency decay: attempt index 0 (newest) = 1.0, index 1 = 0.8, index 2 = 0.64, min floor = 0.5.
 * 3. Thresholds (Configurable):
 *    - Mastery Threshold: >= 70% with sufficient confidence -> demonstrated_understanding
 *    - Difficulty Threshold: < 60% with sufficient confidence -> potential_difficulty
 *    - Borderline (60–69%) -> tracked as progressing / moderate risk
 * 4. Unanswered Questions:
 *    - Only graded questions mapped to concepts in completed attempts are counted.
 *    - Questions skipped without explicit submission rules are not penalized as incorrect.
 */

import type {
  AssessmentAttempt,
  Concept,
  ConceptMasteryEstimate,
  MasteryConfidence,
  StudentCourseMasteryProfile,
} from '@/types';
import type { ConceptDiagnosticStatus } from '@/types/assessment';

export interface MasteryEstimatorConfig {
  minQuestionsForConfidence: number;
  masteryThreshold: number;
  difficultyThreshold: number;
  recencyDecayFactor: number;
  minRecencyWeight: number;
}

export const DEFAULT_MASTERY_CONFIG: MasteryEstimatorConfig = {
  minQuestionsForConfidence: 2,
  masteryThreshold: 70,
  difficultyThreshold: 60,
  recencyDecayFactor: 0.8,
  minRecencyWeight: 0.5,
};

/**
 * Calculates deterministic mastery estimate for a single concept across a list of attempts.
 */
export function estimateConceptMastery(
  concept: Concept,
  completedAttempts: AssessmentAttempt[],
  config: MasteryEstimatorConfig = DEFAULT_MASTERY_CONFIG
): ConceptMasteryEstimate {
  // Sort attempts chronologically descending (newest first)
  const sortedAttempts = [...completedAttempts].sort((a, b) => {
    const timeA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
    const timeB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
    return timeB - timeA;
  });

  let totalWeightedCorrect = 0;
  let totalWeightedQuestions = 0;
  let rawEvaluatedQuestions = 0;
  let rawCorrectQuestions = 0;
  const evidenceList: string[] = [];
  let latestAssessedTimestamp: string | undefined;

  sortedAttempts.forEach((attempt, attemptIndex) => {
    // Determine recency weight
    const recencyWeight = Math.max(
      config.minRecencyWeight,
      Math.pow(config.recencyDecayFactor, attemptIndex)
    );

    // Look for concept breakdown in attempt or question results
    let conceptQuestionsInAttempt = 0;
    let conceptCorrectInAttempt = 0;

    if (attempt.conceptBreakdown && attempt.conceptBreakdown.length > 0) {
      const breakdown = attempt.conceptBreakdown.find((b) => b.conceptId === concept.id);
      if (breakdown && breakdown.questionsCount > 0) {
        conceptQuestionsInAttempt = breakdown.questionsCount;
        conceptCorrectInAttempt = breakdown.correctCount;
      }
    } else if (attempt.results && attempt.results.length > 0) {
      // Fallback: inspect raw question results if available
      for (const res of attempt.results) {
        if (res.conceptId === concept.id) {
          conceptQuestionsInAttempt++;
          if (res.isCorrect) {
            conceptCorrectInAttempt++;
          }
        }
      }
    }

    if (conceptQuestionsInAttempt > 0) {
      if (!latestAssessedTimestamp && attempt.submittedAt) {
        latestAssessedTimestamp = attempt.submittedAt.toDate
          ? attempt.submittedAt.toDate().toISOString()
          : String(attempt.submittedAt);
      }

      rawEvaluatedQuestions += conceptQuestionsInAttempt;
      rawCorrectQuestions += conceptCorrectInAttempt;

      totalWeightedQuestions += conceptQuestionsInAttempt * recencyWeight;
      totalWeightedCorrect += conceptCorrectInAttempt * recencyWeight;

      const attemptPct = Math.round((conceptCorrectInAttempt / conceptQuestionsInAttempt) * 100);
      evidenceList.push(
        `Attempt ${attemptIndex + 1}: ${conceptCorrectInAttempt}/${conceptQuestionsInAttempt} correct (${attemptPct}%) [weight: ${recencyWeight.toFixed(2)}x]`
      );
    }
  });

  // Calculate final score
  let score = 0;
  if (totalWeightedQuestions > 0) {
    score = Math.round((totalWeightedCorrect / totalWeightedQuestions) * 100);
  }

  // Determine confidence
  let confidence: MasteryConfidence = 'insufficient';
  if (rawEvaluatedQuestions === 0) {
    confidence = 'insufficient';
  } else if (rawEvaluatedQuestions < config.minQuestionsForConfidence) {
    confidence = 'insufficient';
  } else if (rawEvaluatedQuestions === 2) {
    confidence = 'low';
  } else if (rawEvaluatedQuestions >= 3 && rawEvaluatedQuestions <= 4) {
    confidence = 'moderate';
  } else {
    confidence = 'high';
  }

  // Determine status
  let status: ConceptDiagnosticStatus = 'not_assessed';
  if (rawEvaluatedQuestions === 0) {
    status = 'not_assessed';
    evidenceList.push(`Concept '${concept.name}' has not yet been assessed in any attempt.`);
  } else if (rawEvaluatedQuestions < config.minQuestionsForConfidence) {
    status = 'insufficient_evidence';
    evidenceList.push(
      `Only ${rawEvaluatedQuestions} question(s) recorded. Minimum ${config.minQuestionsForConfidence} required for conclusive evaluation.`
    );
  } else if (score >= config.masteryThreshold) {
    status = 'demonstrated_understanding';
    evidenceList.push(
      `Demonstrated understanding with score ${score}% (>= ${config.masteryThreshold}% threshold).`
    );
  } else if (score < config.difficultyThreshold) {
    status = 'potential_difficulty';
    evidenceList.push(
      `Identified potential difficulty with score ${score}% (< ${config.difficultyThreshold}% threshold).`
    );
  } else {
    // 60-69% Borderline
    status = 'potential_difficulty';
    evidenceList.push(
      `Borderline performance with score ${score}% (between ${config.difficultyThreshold}% and ${config.masteryThreshold}%). Needs practice.`
    );
  }

  return {
    conceptId: concept.id,
    conceptName: concept.name,
    score,
    confidence,
    evaluatedQuestions: rawEvaluatedQuestions,
    correctQuestions: rawCorrectQuestions,
    status,
    evidence: evidenceList,
    recencyFactor: sortedAttempts.length > 0 ? 1.0 : 0,
    lastAssessedAt: latestAssessedTimestamp,
  };
}

/**
 * Calculates the complete course-level mastery profile for a student across all course concepts.
 */
export function estimateStudentCourseMastery(
  studentId: string,
  courseId: string,
  concepts: Concept[],
  completedAttempts: AssessmentAttempt[],
  config: MasteryEstimatorConfig = DEFAULT_MASTERY_CONFIG
): StudentCourseMasteryProfile {
  const masteries: Record<string, ConceptMasteryEstimate> = {};
  let weightedScoreSum = 0;
  let totalEvaluatedWeights = 0;
  let evaluatedConceptCount = 0;

  for (const concept of concepts) {
    const est = estimateConceptMastery(concept, completedAttempts, config);
    masteries[concept.id] = est;

    if (est.status !== 'not_assessed') {
      evaluatedConceptCount++;
      // Weight higher confidence evaluations slightly more in overall course average
      const confMultiplier =
        est.confidence === 'high' ? 1.2 : est.confidence === 'moderate' ? 1.0 : 0.8;
      weightedScoreSum += est.score * confMultiplier;
      totalEvaluatedWeights += confMultiplier;
    }
  }

  const overallMastery =
    totalEvaluatedWeights > 0 ? Math.round(weightedScoreSum / totalEvaluatedWeights) : 0;

  return {
    studentId,
    courseId,
    overallMastery,
    totalConcepts: concepts.length,
    evaluatedConcepts: evaluatedConceptCount,
    masteries,
    lastCalculatedAt: new Date().toISOString(),
  };
}
