/**
 * src/services/ai/agnes/agnesTypes.ts
 *
 * TypeScript types and Zod schemas for the Agnes 3.0 Flash runtime AI service.
 * Enforces structured responses, source metadata references, and provider isolation.
 */

import { z } from 'zod';

// ─── Source Reference Schema ─────────────────────────────────────────────────

export const sourceReferenceSchema = z.object({
  materialId: z.string().min(1, 'materialId is required'),
  materialTitle: z.string().optional(),
  chunkId: z.string().min(1, 'chunkId is required'),
  pageNumber: z.number().int().positive().optional(),
  conceptId: z.string().optional(),
  relevanceNote: z.string().optional(),
});

export type SourceReference = z.infer<typeof sourceReferenceSchema>;

// ─── AI Analysis Response Schema ─────────────────────────────────────────────

export const aiAnalysisResponseSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  findings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  sourceReferences: z.array(sourceReferenceSchema).default([]),
  insufficientContext: z.boolean().default(false),
  /**
   * Model-reported confidence rating (0 to 1).
   * Note: This is an uncalibrated heuristic reported by the LLM, not a statistical guarantee.
   */
  modelReportedConfidence: z.number().min(0).max(1).optional(),
});

export type AIAnalysisResponse = z.infer<typeof aiAnalysisResponseSchema>;

// ─── AI Conflict Analysis Response Schema (Phase 8) ──────────────────────────

export const conflictSeveritySchema = z.enum(['low', 'medium', 'high']);

export const detectedConflictSchema = z.object({
  /** Short label for the conflicting topic/claim area */
  conflictTopic: z.string().min(1),
  /** Verbatim or lightly paraphrased claim from source A */
  claimA: z.string().min(1),
  /** Verbatim or lightly paraphrased claim from source B */
  claimB: z.string().min(1),
  /** AI explanation of why these two claims conflict */
  conflictSummary: z.string().min(1),
  severity: conflictSeveritySchema,
  /** Pedagogical note for the teacher's benefit (NOT a verdict on truth) */
  pedagogicalNote: z.string().optional(),
  /** Uncalibrated model confidence in this specific conflict (0–1) */
  modelReportedConfidence: z.number().min(0).max(1).optional(),
});

export type DetectedConflict = z.infer<typeof detectedConflictSchema>;

export const conflictAnalysisResponseSchema = z.object({
  /** Overall summary of the comparison between source A and source B */
  comparisonSummary: z.string().min(1),
  /** True when the AI finds no meaningful contradictions */
  noConflictsFound: z.boolean().default(false),
  /** List of specific conflicts identified */
  conflicts: z.array(detectedConflictSchema).default([]),
  /** True when the provided chunks are insufficient to perform a reliable comparison */
  insufficientContext: z.boolean().default(false),
  /** Overall model-reported confidence across all detected conflicts (0–1) */
  overallModelReportedConfidence: z.number().min(0).max(1).optional(),
});

export type ConflictAnalysisResponse = z.infer<typeof conflictAnalysisResponseSchema>;

// ─── AI Explanation Response Schema ──────────────────────────────────────────

export const aiExplanationResponseSchema = z.object({
  conceptName: z.string().min(1, 'conceptName is required'),
  explanation: z.string().min(1, 'Explanation is required'),
  keyPoints: z.array(z.string()).default([]),
  sourceReferences: z.array(sourceReferenceSchema).default([]),
  insufficientContext: z.boolean().default(false),
  pedagogicalSuggestions: z.array(z.string()).default([]),
});

export type AIExplanationResponse = z.infer<typeof aiExplanationResponseSchema>;

// ─── Agnes Health / Ping Response Schema ─────────────────────────────────────

export const agnesTestResponseSchema = z.object({
  status: z.literal('operational'),
  model: z.string(),
  message: z.string(),
  timestamp: z.string(),
});

export type AgnesTestResponse = z.infer<typeof agnesTestResponseSchema>;

// ─── Agnes Client Configuration & Chat Contracts ─────────────────────────────

export interface AgnesClientConfig {
  apiKey?: string;
  apiUrl: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  maxContextChunks: number;
  maxContextCharacters: number;
}

export type AgnesChatRole = 'system' | 'user' | 'assistant';

export interface AgnesChatMessage {
  role: AgnesChatRole;
  content: string;
}

export interface AgnesChatCompletionOptions {
  requestId?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface AgnesRawUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AgnesRawResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: AgnesRawUsage;
}

export interface AgnesCompletionResult<T> {
  data: T;
  rawText: string;
  usage?: AgnesRawUsage;
  requestId: string;
  model: string;
  durationMs: number;
}
