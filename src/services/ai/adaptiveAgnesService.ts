/**
 * src/services/ai/adaptiveAgnesService.ts
 *
 * Phase 10: Agnes 3.0 Flash Adaptive Learning Assistant
 *
 * Provides evidence-grounded, pedagogical explanations for deterministic
 * adaptive recommendations and interventions.
 *
 * Key Constraints:
 * 1. AI NEVER sets authoritative mastery scores or grades. Scores are 100% deterministic code.
 * 2. Grounded strictly in teacher-approved concepts and course resources.
 * 3. Graceful fallback: Returns clear, deterministic explanations if Agnes is offline or rate-limited.
 */

import { z } from 'zod';
import { agnesClient } from './agnes/agnesClient';
import type { AgnesChatMessage } from './agnes/agnesTypes';

export const adaptiveRationaleSchema = z.object({
  pedagogicalRationale: z.string().min(1),
  focusTips: z.array(z.string()).default([]),
  prerequisiteConnection: z.string().optional(),
  recommendedAction: z.string().min(1),
  isAiGenerated: z.boolean().default(true),
});

export type AdaptiveRationale = z.infer<typeof adaptiveRationaleSchema>;

export interface GenerateAdaptiveRationaleParams {
  conceptName: string;
  conceptDescription?: string;
  currentMasteryScore: number;
  evaluatedQuestions: number;
  evidence: string[];
  isPrerequisiteGap: boolean;
  blockedConceptName?: string;
  prerequisiteConceptName?: string;
  resourceTitle?: string;
  resourceType?: string;
}

export const adaptiveAgnesService = {
  /**
   * Generates a pedagogical explanation for why an activity is recommended,
   * grounded in student assessment evidence and course knowledge.
   */
  async generateRecommendationRationale(
    params: GenerateAdaptiveRationaleParams
  ): Promise<AdaptiveRationale> {
    const {
      conceptName,
      conceptDescription,
      currentMasteryScore,
      evaluatedQuestions,
      evidence,
      isPrerequisiteGap,
      blockedConceptName,
      prerequisiteConceptName,
      resourceTitle,
      resourceType,
    } = params;

    // Deterministic fallback generator
    const getFallback = (): AdaptiveRationale => {
      if (isPrerequisiteGap && blockedConceptName) {
        return {
          pedagogicalRationale: `Mastery of '${conceptName}' is a foundational prerequisite for understanding '${blockedConceptName}'. Addressing this gap now eliminates learning bottlenecks downstream.`,
          focusTips: [
            `Review fundamental principles of ${conceptName}`,
            `Check prerequisite definitions before attempting ${blockedConceptName} exercises`,
          ],
          prerequisiteConnection: `Direct foundation for: ${blockedConceptName}`,
          recommendedAction: resourceTitle
            ? `Study ${resourceType || 'course material'}: '${resourceTitle}'`
            : `Review core concept overview for ${conceptName}`,
          isAiGenerated: false,
        };
      }

      if (currentMasteryScore < 60) {
        return {
          pedagogicalRationale: `Recent assessment results demonstrate ${currentMasteryScore}% score across ${evaluatedQuestions} questions in '${conceptName}'. Targeted practice will strengthen comprehension.`,
          focusTips: [
            `Focus on core misconceptions identified in previous quiz attempts`,
            `Work through step-by-step examples in available course notes`,
          ],
          recommendedAction: resourceTitle
            ? `Review '${resourceTitle}' and complete practice exercises`
            : `Consult lecture notes on ${conceptName}`,
          isAiGenerated: false,
        };
      }

      return {
        pedagogicalRationale: `Expanding knowledge into '${conceptName}' builds directly on your established course foundation.`,
        focusTips: [
          `Read introductory concepts and connect with previous topics`,
          `Complete self-check questions to verify initial grasp`,
        ],
        recommendedAction: resourceTitle
          ? `Explore '${resourceTitle}'`
          : `Review curriculum outline for ${conceptName}`,
        isAiGenerated: false,
      };
    };

    try {
      const systemPrompt = `You are Agnes 3.0 Flash, an expert AI pedagogical advisor for EduPilot AI.
Your purpose is to provide clear, encouraging, and evidence-grounded educational rationale explaining WHY a specific learning activity is recommended to a student.

Rules:
1. Ground your explanation STRICTLY in the provided assessment evidence and concept definitions.
2. DO NOT invent or speculate about unverified skills or outside topics.
3. Be supportive, concise, and academically precise.
4. Output valid JSON matching the required schema.

Output Schema:
{
  "pedagogicalRationale": "1-2 sentences explaining why this concept requires practice based on evidence",
  "focusTips": ["2 actionable study tips tailored to this concept"],
  "prerequisiteConnection": "Optional note on prerequisite relationships",
  "recommendedAction": "1 clear next step for the student",
  "isAiGenerated": true
}`;

      const userPrompt = `Student Context:
- Target Concept: ${conceptName}
- Concept Description: ${conceptDescription || 'Core curriculum topic'}
- Current Score: ${currentMasteryScore}% (Evaluated on ${evaluatedQuestions} questions)
- Is Prerequisite Gap: ${isPrerequisiteGap ? 'Yes' : 'No'}
${blockedConceptName ? `- Downstream Blocked Concept: ${blockedConceptName}` : ''}
${prerequisiteConceptName ? `- Prerequisite Concept: ${prerequisiteConceptName}` : ''}
${resourceTitle ? `- Available Resource: ${resourceTitle} (${resourceType || 'Material'})` : '- Available Resource: General Curriculum Guide'}
- Evidence: ${evidence.join('; ')}

Generate the pedagogical explanation in valid JSON.`;

      const messages: AgnesChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const res = await agnesClient.completeChat(messages, adaptiveRationaleSchema, {
        temperature: 0.2,
        maxTokens: 500,
        responseFormat: 'json_object',
      });

      if (res && res.data) {
        return {
          ...res.data,
          isAiGenerated: true,
        };
      }

      return getFallback();
    } catch {
      // Graceful fallback if Agnes AI is offline or rate-limited
      return getFallback();
    }
  },
};
