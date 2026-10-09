/**
 * src/services/learning/adaptivePlanner.ts
 *
 * Phase 10: Prioritized Personalized Learning Planner
 *
 * Maps identified learning gaps and mastery estimates to real course learning resources.
 *
 * Prioritization Ordering:
 * 1. Root-cause Prerequisite Gaps (Foundations blocking downstream progress) -> Priority: High
 * 2. Severe Observed Gaps (Mastery < 40%) -> Priority: High
 * 3. Moderate Observed Gaps (Mastery 40–59%) -> Priority: Medium
 * 4. Next Curriculum Concepts (Unassessed or progressing) -> Priority: Low
 *
 * Resource Grounding:
 * - Matches real Course Materials (PDFs, docs) associated with the concept.
 * - Matches real Course Assessments for practice or diagnostic.
 * - If no matching resource exists, sets resourceAvailable = false and explicitly
 *   informs the student/teacher. NEVER fabricates fake resources or URLs.
 */

import type {
  AdaptiveActivity,
  Assessment,
  Concept,
  IdentifiedLearningGap,
  Material,
  StudentCourseMasteryProfile,
} from '@/types';

export interface PlanGenerationInput {
  studentId: string;
  courseId: string;
  concepts: Concept[];
  materials: Material[];
  assessments: Assessment[];
  masteryProfile: StudentCourseMasteryProfile;
  activeGaps: IdentifiedLearningGap[];
}

/**
 * Deterministically generates an array of prioritized learning activities for a student.
 */
export function generateAdaptiveActivities(input: PlanGenerationInput): AdaptiveActivity[] {
  const { concepts, materials, assessments, masteryProfile, activeGaps } = input;

  const conceptMap = new Map<string, Concept>();
  for (const c of concepts) {
    conceptMap.set(c.id, c);
  }

  // Helper: Find real course material covering a concept
  function findMaterialForConcept(concept: Concept): Material | undefined {
    // 1. Direct match on materialIds array
    if (concept.materialIds && concept.materialIds.length > 0) {
      const direct = materials.find((m) => concept.materialIds?.includes(m.id));
      if (direct) return direct;
    }

    // 2. Fallback: Title or keyword match
    const lowerName = concept.name.toLowerCase();
    const keywordMatch = materials.find(
      (m) =>
        m.title.toLowerCase().includes(lowerName) ||
        (m.description && m.description.toLowerCase().includes(lowerName))
    );
    if (keywordMatch) return keywordMatch;

    return undefined;
  }

  // Helper: Find real practice or diagnostic assessment covering a concept
  function findAssessmentForConcept(concept: Concept): Assessment | undefined {
    return assessments.find((a) => a.conceptIds && a.conceptIds.includes(concept.id));
  }

  const activities: AdaptiveActivity[] = [];
  const processedConceptIds = new Set<string>();
  let currentOrder = 1;

  // ─── Step 1: Foundational Prerequisite Gaps (Highest Priority) ───────────────
  const prerequisiteGaps = activeGaps.filter((g) => g.isPrerequisiteGap);
  for (const gap of prerequisiteGaps) {
    const concept = conceptMap.get(gap.conceptId);
    if (!concept || processedConceptIds.has(concept.id)) continue;
    processedConceptIds.add(concept.id);

    const mat = findMaterialForConcept(concept);
    const ass = findAssessmentForConcept(concept);

    activities.push({
      id: `act_prereq_${concept.id}_${currentOrder}`,
      order: currentOrder++,
      conceptId: concept.id,
      conceptName: concept.name,
      activityType: mat ? 'lesson' : ass ? 'practice' : 'revision',
      priority: 'high',
      title: `Reinforce Foundation: ${concept.name}`,
      description: `Review fundamental prerequisite concept required for ${gap.blockedConceptName || 'advanced topics'}.`,
      reason: `Foundational prerequisite blocking progress in ${gap.blockedConceptName || 'subsequent topics'}.`,
      evidence: gap.evidence,
      referenceId: mat ? mat.id : ass ? ass.id : undefined,
      resourceTitle: mat ? mat.title : ass ? ass.title : undefined,
      resourceType: mat ? 'Course Material' : ass ? 'Assessment' : 'Conceptual Guide',
      resourceAvailable: Boolean(mat || ass),
      isPrerequisiteReinforcement: true,
      prerequisiteInfo: `Prerequisite for: ${gap.blockedConceptName || 'Advanced Concepts'}`,
      status: 'pending',
    });
  }

  // ─── Step 2: Direct High-Risk Observed Gaps ────────────────────────────────
  const highRiskGaps = activeGaps.filter(
    (g) => !g.isPrerequisiteGap && g.riskLevel === 'high'
  );
  for (const gap of highRiskGaps) {
    const concept = conceptMap.get(gap.conceptId);
    if (!concept || processedConceptIds.has(concept.id)) continue;
    processedConceptIds.add(concept.id);

    const mat = findMaterialForConcept(concept);
    const ass = findAssessmentForConcept(concept);

    activities.push({
      id: `act_high_${concept.id}_${currentOrder}`,
      order: currentOrder++,
      conceptId: concept.id,
      conceptName: concept.name,
      activityType: mat ? 'lesson' : 'revision',
      priority: 'high',
      title: `Address Core Difficulty: ${concept.name}`,
      description: `Targeted review to address demonstrated difficulty (Current score: ${gap.currentMastery}%).`,
      reason: gap.reason,
      evidence: gap.evidence,
      referenceId: mat ? mat.id : ass ? ass.id : undefined,
      resourceTitle: mat ? mat.title : ass ? ass.title : undefined,
      resourceType: mat ? 'Course Material' : ass ? 'Assessment' : 'Conceptual Guide',
      resourceAvailable: Boolean(mat || ass),
      isPrerequisiteReinforcement: false,
      status: 'pending',
    });
  }

  // ─── Step 3: Direct Medium/Low-Risk Observed Gaps ───────────────────────────
  const otherGaps = activeGaps.filter(
    (g) => !g.isPrerequisiteGap && g.riskLevel !== 'high'
  );
  for (const gap of otherGaps) {
    const concept = conceptMap.get(gap.conceptId);
    if (!concept || processedConceptIds.has(concept.id)) continue;
    processedConceptIds.add(concept.id);

    const mat = findMaterialForConcept(concept);
    const ass = findAssessmentForConcept(concept);

    activities.push({
      id: `act_med_${concept.id}_${currentOrder}`,
      order: currentOrder++,
      conceptId: concept.id,
      conceptName: concept.name,
      activityType: ass ? 'practice' : mat ? 'lesson' : 'revision',
      priority: 'medium',
      title: `Practice & Consolidate: ${concept.name}`,
      description: `Solidify understanding with targeted practice (Current score: ${gap.currentMastery}%).`,
      reason: gap.reason,
      evidence: gap.evidence,
      referenceId: ass ? ass.id : mat ? mat.id : undefined,
      resourceTitle: ass ? ass.title : mat ? mat.title : undefined,
      resourceType: ass ? 'Practice Assessment' : mat ? 'Course Material' : 'Review Note',
      resourceAvailable: Boolean(mat || ass),
      isPrerequisiteReinforcement: false,
      status: 'pending',
    });
  }

  // ─── Step 4: Next Unassessed Curriculum Concepts ────────────────────────────
  for (const concept of concepts) {
    if (processedConceptIds.has(concept.id)) continue;

    const est = masteryProfile.masteries[concept.id];
    // If not assessed or has insufficient evidence, recommend exploring
    if (!est || est.status === 'not_assessed' || est.status === 'insufficient_evidence') {
      processedConceptIds.add(concept.id);

      const mat = findMaterialForConcept(concept);
      const ass = findAssessmentForConcept(concept);

      activities.push({
        id: `act_next_${concept.id}_${currentOrder}`,
        order: currentOrder++,
        conceptId: concept.id,
        conceptName: concept.name,
        activityType: ass ? 'quiz' : mat ? 'lesson' : 'revision',
        priority: 'low',
        title: `Curriculum Exploration: ${concept.name}`,
        description: `Explore new concept in the curriculum sequence.`,
        reason: `Concept has not yet been assessed. Establishing baseline understanding.`,
        evidence: est ? est.evidence : [`Unassessed curriculum topic.`],
        referenceId: ass ? ass.id : mat ? mat.id : undefined,
        resourceTitle: ass ? ass.title : mat ? mat.title : undefined,
        resourceType: ass ? 'Assessment' : mat ? 'Course Material' : 'Curriculum Reading',
        resourceAvailable: Boolean(mat || ass),
        isPrerequisiteReinforcement: false,
        status: 'pending',
      });
    }
  }

  return activities;
}
