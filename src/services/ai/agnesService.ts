/**
 * src/services/ai/agnesService.ts
 *
 * High-level AI reasoning service for EduPilot AI powered by Agnes 3.0 Flash.
 * Coordinates:
 * - Source context building & cross-course boundary enforcement
 * - Agnes prompt generation with strict grounding & anti-injection defenses
 * - AgnesClient execution (timeouts, retries, rate-limits, validation)
 * - Immutable Firestore audit logging via existing aiService.logDecisionEvent
 * - Human-in-the-loop compliance (never directly mutates student/curriculum records)
 */

import type { MaterialChunk, Concept, DbResult } from '@/types';
import {
  agnesClient,
  AgnesClient,
  AgnesChatMessage,
  AIAnalysisResponse,
  aiAnalysisResponseSchema,
  AIExplanationResponse,
  aiExplanationResponseSchema,
  AgnesTestResponse,
  agnesTestResponseSchema,
  ConflictAnalysisResponse,
  conflictAnalysisResponseSchema,
  buildAnalysisSystemPrompt,
  buildExplanationSystemPrompt,
  buildHealthTestPrompt,
  buildConflictAnalysisSystemPrompt,
  normalizeAgnesError,
} from './agnes';
import { buildGroundingContext, ContextBuilderError } from './context';
import { aiService } from './aiService';

export interface AnalyzeContextParams {
  courseId: string;
  selectedChunks: MaterialChunk[];
  selectedConcepts?: Concept[];
  language?: string;
  userId: string;
  materialTitles?: Record<string, string>;
  client?: AgnesClient;
}

export interface ExplainConceptParams {
  courseId: string;
  concept: Concept;
  selectedChunks: MaterialChunk[];
  language?: string;
  userId: string;
  materialTitles?: Record<string, string>;
  client?: AgnesClient;
}

export interface TestAgnesParams {
  userId: string;
  client?: AgnesClient;
}

/**
 * Phase 8: Input for AI-powered conflict detection between two source chunks.
 */
export interface AnalyzeSourceConflictParams {
  courseId: string;
  /** Chunk from source material A */
  chunkA: MaterialChunk;
  materialTitleA?: string;
  /** Chunk from source material B */
  chunkB: MaterialChunk;
  materialTitleB?: string;
  /** Optional concept context */
  conceptId?: string;
  conceptName?: string;
  language?: string;
  userId: string;
  /** Trust tiers for provenance context (not fed to AI — kept for Firestore record). */
  trustTierA?: import('@/types').TrustTier;
  trustTierB?: import('@/types').TrustTier;
  client?: AgnesClient;
}

export const agnesService = {
  /**
   * Health-check ping verifying Agnes 3.0 Flash operational status.
   */
  async testAgnesConnection(params: TestAgnesParams): Promise<DbResult<AgnesTestResponse>> {
    const client = params.client || agnesClient;
    const aiRequestId = `ping_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const messages: AgnesChatMessage[] = [
        {
          role: 'system',
          content: buildHealthTestPrompt(),
        },
        {
          role: 'user',
          content: 'Ping. Confirm operational status.',
        },
      ];

      const res = await client.completeChat(messages, agnesTestResponseSchema, {
        requestId: aiRequestId,
        responseFormat: 'json_object',
      });

      // Log decision event to Firestore audit trail
      await aiService.logDecisionEvent({
        courseId: 'system',
        eventType: 'analysis',
        summary: 'Agnes AI operational health verification',
        reasoning: `Operational test passed for model ${res.model} in ${res.durationMs}ms. Request ID: ${res.requestId}.`,
      });

      return {
        success: true,
        data: res.data,
      };
    } catch (err: unknown) {
      const normalized = normalizeAgnesError(err, aiRequestId);

      // Audit the failure
      await aiService.logDecisionEvent({
        courseId: 'system',
        eventType: 'analysis',
        summary: 'Agnes AI operational health check failed',
        reasoning: `Health check failed: ${normalized.code} - ${normalized.message}.`,
      }).catch(() => {
        // Suppress secondary audit error if Firestore logging fails during an outage
      });

      return {
        success: false,
        error: normalized.safeUserMessage,
      };
    }
  },

  /**
   * Analyzes educational source materials and concepts, returning structured findings and recommendations.
   */
  async analyzeEducationalContext(params: AnalyzeContextParams): Promise<DbResult<AIAnalysisResponse>> {
    const client = params.client || agnesClient;
    const aiRequestId = `analyze_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      // 1. Build and validate grounded context
      const contextResult = buildGroundingContext({
        courseId: params.courseId,
        chunks: params.selectedChunks,
        concepts: params.selectedConcepts,
        materialTitles: params.materialTitles,
      });

      // 2. Prepare source-grounded prompt with prompt injection defense
      const systemPrompt = buildAnalysisSystemPrompt(params.language);
      const userPrompt = [
        `Please analyze the following educational sources and concepts for Course ${params.courseId}.`,
        '',
        contextResult.formattedContext,
        '',
        'Synthesize findings and recommendations based STRICTLY on the supplied sources.',
      ].join('\n');

      const messages: AgnesChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // 3. Execute with AgnesClient
      const res = await client.completeChat(messages, aiAnalysisResponseSchema, {
        requestId: aiRequestId,
        responseFormat: 'json_object',
      });

      // 4. Log immutable AI Decision Event
      await aiService.logDecisionEvent({
        courseId: params.courseId,
        eventType: 'analysis',
        summary: `Educational context analysis: ${res.data.summary.slice(0, 100)}...`,
        reasoning: `Analyzed ${contextResult.uniqueChunkCount} chunks (${contextResult.totalCharacters} chars). Model: ${res.model}. Chunks: ${contextResult.includedChunkIds.slice(0, 5).join(', ')}. Insufficient context flag: ${res.data.insufficientContext}.`,
      });

      return {
        success: true,
        data: res.data,
      };
    } catch (err: unknown) {
      if (err instanceof ContextBuilderError) {
        return {
          success: false,
          error: err.message,
        };
      }

      const normalized = normalizeAgnesError(err, aiRequestId);

      // Log failure in decision events
      await aiService.logDecisionEvent({
        courseId: params.courseId,
        eventType: 'analysis',
        summary: 'Educational context analysis failed',
        reasoning: `Failure code: ${normalized.code}. Safe user message: ${normalized.safeUserMessage}.`,
      }).catch(() => {});

      return {
        success: false,
        error: normalized.safeUserMessage,
      };
    }
  },

  /**
   * Explains an educational concept strictly from provided course chunks.
   */
  async explainConceptFromSources(params: ExplainConceptParams): Promise<DbResult<AIExplanationResponse>> {
    const client = params.client || agnesClient;
    const aiRequestId = `explain_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      // 1. Build and validate grounded context
      const contextResult = buildGroundingContext({
        courseId: params.courseId,
        chunks: params.selectedChunks,
        concepts: [params.concept],
        materialTitles: params.materialTitles,
      });

      // 2. Prepare grounded explanation prompt
      const systemPrompt = buildExplanationSystemPrompt(params.concept.name, params.language);
      const userPrompt = [
        `Target Concept: "${params.concept.name}" (ID: ${params.concept.id})`,
        '',
        contextResult.formattedContext,
        '',
        `Explain "${params.concept.name}" strictly using the sources provided above.`,
      ].join('\n');

      const messages: AgnesChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // 3. Execute with AgnesClient
      const res = await client.completeChat(messages, aiExplanationResponseSchema, {
        requestId: aiRequestId,
        responseFormat: 'json_object',
      });

      // 4. Log immutable AI Decision Event
      await aiService.logDecisionEvent({
        courseId: params.courseId,
        eventType: 'explanation',
        summary: `Concept explanation: ${params.concept.name}`,
        reasoning: `Explained concept "${params.concept.name}" (${params.concept.id}) from ${contextResult.uniqueChunkCount} source chunks. Model: ${res.model}. Citations count: ${res.data.sourceReferences.length}.`,
      });

      return {
        success: true,
        data: res.data,
      };
    } catch (err: unknown) {
      if (err instanceof ContextBuilderError) {
        return {
          success: false,
          error: err.message,
        };
      }

      const normalized = normalizeAgnesError(err, aiRequestId);

      await aiService.logDecisionEvent({
        courseId: params.courseId,
        eventType: 'explanation',
        summary: `Concept explanation failed: ${params.concept.name}`,
        reasoning: `Failure code: ${normalized.code}. Safe user message: ${normalized.safeUserMessage}.`,
      }).catch(() => {});

      return {
        success: false,
        error: normalized.safeUserMessage,
      };
    }
  },

  /**
   * Phase 8: Analyzes two material chunks for factual conflicts using Agnes.
   *
   * ARCHITECTURE:
   * - Agnes detects contradictions only. It does NOT decide which source is correct.
   * - Each detected conflict is persisted to Firestore with status 'pending'.
   * - Teacher must explicitly call conflictService.resolveConflict to act.
   * - Cross-course source comparison is strictly prohibited.
   */
  async analyzeSourceConflict(
    params: AnalyzeSourceConflictParams
  ): Promise<DbResult<ConflictAnalysisResponse>> {
    const { conflictService } = await import('@/services/conflict/conflictService');
    const client = params.client || agnesClient;
    const aiRequestId = `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Course isolation: both chunks must belong to the requested course
    if (params.chunkA.courseId !== params.courseId) {
      return {
        success: false,
        error: `Security violation: chunkA belongs to course "${params.chunkA.courseId}", not "${params.courseId}". Cross-course conflict analysis is prohibited.`,
      };
    }
    if (params.chunkB.courseId !== params.courseId) {
      return {
        success: false,
        error: `Security violation: chunkB belongs to course "${params.chunkB.courseId}", not "${params.courseId}". Cross-course conflict analysis is prohibited.`,
      };
    }

    try {
      const materialTitleA = params.materialTitleA ?? params.chunkA.materialId;
      const materialTitleB = params.materialTitleB ?? params.chunkB.materialId;

      const systemPrompt = buildConflictAnalysisSystemPrompt(params.language);
      const userPrompt = [
        `Compare the following two educational source excerpts for factual conflicts.`,
        params.conceptName
          ? `Context concept: "${params.conceptName}" (Course: ${params.courseId})`
          : `Course: ${params.courseId}`,
        '',
        '=== SOURCE A ===',
        `Material: ${materialTitleA} (ID: ${params.chunkA.materialId})`,
        `Chunk ID: ${params.chunkA.id}`,
        params.chunkA.pageNumber ? `Page: ${params.chunkA.pageNumber}` : '',
        '--- Content ---',
        `<<< UNTRUSTED DATA START >>>`,
        params.chunkA.text,
        `<<< UNTRUSTED DATA END >>>`,
        '',
        '=== SOURCE B ===',
        `Material: ${materialTitleB} (ID: ${params.chunkB.materialId})`,
        `Chunk ID: ${params.chunkB.id}`,
        params.chunkB.pageNumber ? `Page: ${params.chunkB.pageNumber}` : '',
        '--- Content ---',
        `<<< UNTRUSTED DATA START >>>`,
        params.chunkB.text,
        `<<< UNTRUSTED DATA END >>>`,
        '',
        'Identify any genuine factual contradictions between Source A and Source B. Do NOT declare which source is correct.',
      ]
        .filter(Boolean)
        .join('\n');

      const messages: AgnesChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const res = await client.completeChat(messages, conflictAnalysisResponseSchema, {
        requestId: aiRequestId,
        responseFormat: 'json_object',
      });

      // Log to audit trail first so we have the event ID
      const auditRes = await aiService.logDecisionEvent({
        courseId: params.courseId,
        eventType: 'source_conflict',
        summary: `Conflict analysis: ${params.chunkA.materialId} vs ${params.chunkB.materialId} — ${res.data.conflicts.length} conflict(s) detected`,
        reasoning: `Model: ${res.model}. Request: ${aiRequestId}. Comparison: "${materialTitleA}" vs "${materialTitleB}". Conflicts: ${res.data.conflicts.length}. noConflictsFound: ${res.data.noConflictsFound}. insufficientContext: ${res.data.insufficientContext}.`,
      });

      const auditEventId = auditRes.success ? auditRes.data?.id : undefined;

      // Persist each detected conflict as 'pending' for teacher review
      if (!res.data.noConflictsFound && res.data.conflicts.length > 0) {
        for (const detected of res.data.conflicts) {
          await conflictService.createConflict({
            courseId: params.courseId,
            conceptId: params.conceptId,
            conceptName: params.conceptName,
            materialIdA: params.chunkA.materialId,
            materialTitleA,
            chunkIdA: params.chunkA.id,
            pageNumberA: params.chunkA.pageNumber,
            claimA: detected.claimA,
            materialIdB: params.chunkB.materialId,
            materialTitleB,
            chunkIdB: params.chunkB.id,
            pageNumberB: params.chunkB.pageNumber,
            claimB: detected.claimB,
            conflictSummary: detected.conflictSummary,
            severity: detected.severity,
            modelReportedConfidence: detected.modelReportedConfidence,
            pedagogicalNote: detected.pedagogicalNote,
            trustTierA: params.trustTierA,
            trustTierB: params.trustTierB,
            aiDecisionEventId: auditEventId,
            agnesRequestId: aiRequestId,
          });
        }
      }

      return { success: true, data: res.data };
    } catch (err: unknown) {
      const normalized = normalizeAgnesError(err, aiRequestId);

      await aiService
        .logDecisionEvent({
          courseId: params.courseId,
          eventType: 'source_conflict',
          summary: `Conflict analysis failed: ${params.chunkA.materialId} vs ${params.chunkB.materialId}`,
          reasoning: `Failure: ${normalized.code} — ${normalized.safeUserMessage}. Request: ${aiRequestId}.`,
        })
        .catch(() => {});

      return {
        success: false,
        error: normalized.safeUserMessage,
      };
    }
  },
};

