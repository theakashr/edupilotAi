/**
 * src/services/ai/agnes/agnesClient.ts
 *
 * Dedicated server-side client for Agnes 3.0 Flash.
 * Enforces:
 * - Server-side only execution with AGNES_API_KEY security
 * - Configurable request timeout via AbortController
 * - Exponential backoff retry strategy for transient errors (429, 502-504, network, timeout)
 * - Rate-limit and network error normalization
 * - Zod structured output schema validation
 * - Request ID propagation and secret-safe logging
 * - Pluggable fetch support for automated offline testing
 */

import { z } from 'zod';
import {
  AgnesClientConfig,
  AgnesChatMessage,
  AgnesChatCompletionOptions,
  AgnesCompletionResult,
  AgnesRawResponse,
} from './agnesTypes';
import { AgnesError, normalizeAgnesError } from './agnesErrors';

/**
 * Reads centralized Agnes runtime configuration from environment.
 */
export function getAgnesConfig(): AgnesClientConfig {
  return {
    apiKey: process.env.AGNES_API_KEY,
    apiUrl: process.env.AGNES_API_URL || 'https://apihub.agnes-ai.com/v1',
    model: process.env.AGNES_MODEL || 'agnes-3.0-flash',
    timeoutMs: parseInt(process.env.AGNES_REQUEST_TIMEOUT_MS || '30000', 10),
    maxRetries: parseInt(process.env.AGNES_MAX_RETRIES || '3', 10),
    maxContextChunks: parseInt(process.env.AGNES_MAX_CONTEXT_CHUNKS || '10', 10),
    maxContextCharacters: parseInt(process.env.AGNES_MAX_CONTEXT_CHARACTERS || '12000', 10),
  };
}

/**
 * Extracts and cleans JSON string from model response, handling optional markdown code fences.
 */
export function extractJsonFromResponse(rawContent: string): unknown {
  const trimmed = rawContent.trim();

  // Check for ```json ... ``` or ``` ... ``` code blocks
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonString = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonString);
  } catch (parseErr) {
    throw new AgnesError({
      code: 'AI_INVALID_RESPONSE',
      message: `Failed to parse AI output as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      status: 502,
      retryable: false,
    });
  }
}

/**
 * Utility delay with promise.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AgnesClientOptions {
  config?: Partial<AgnesClientConfig>;
  fetchFn?: typeof fetch;
}

export class AgnesClient {
  private config: AgnesClientConfig;
  private fetchFn: typeof fetch;

  constructor(options?: AgnesClientOptions) {
    this.config = {
      ...getAgnesConfig(),
      ...(options?.config || {}),
    };
    this.fetchFn = options?.fetchFn || globalThis.fetch;
  }

  /**
   * Returns current active model identifier.
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Executes a structured completion with Agnes 3.0 Flash.
   */
  async completeChat<T>(
    messages: AgnesChatMessage[],
    schema: z.ZodType<T>,
    options?: AgnesChatCompletionOptions
  ): Promise<AgnesCompletionResult<T>> {
    const aiRequestId = options?.requestId || `agnes_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 1. API Key Presence Check
    if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
      throw new AgnesError({
        code: 'AI_CONFIGURATION_ERROR',
        message: 'Agnes AI API key is not configured in server environment.',
        status: 500,
        requestId: aiRequestId,
      });
    }

    const endpoint = `${this.config.apiUrl.replace(/\/+$/, '')}/chat/completions`;
    const maxRetries = Math.max(1, this.config.maxRetries);
    let lastError: AgnesError | null = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const abortController = new AbortController();
      const timeoutTimer = setTimeout(() => {
        abortController.abort();
      }, this.config.timeoutMs);

      try {
        const payload: Record<string, unknown> = {
          model: this.config.model,
          messages,
          temperature: options?.temperature ?? 0.2,
        };

        if (options?.maxTokens) {
          payload.max_tokens = options.maxTokens;
        }

        if (options?.responseFormat === 'json_object') {
          payload.response_format = { type: 'json_object' };
        }

        const response = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'X-Request-ID': aiRequestId,
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        clearTimeout(timeoutTimer);

        // Check rate limiting (429)
        if (response.status === 429) {
          const isRetryable = attempt < maxRetries;
          const retryAfterHeader = response.headers.get('retry-after');
          const waitTimeMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : Math.min(1000 * Math.pow(2, attempt), 8000);

          lastError = new AgnesError({
            code: 'AI_RATE_LIMITED',
            message: `Agnes AI rate limit exceeded (HTTP 429). Attempt ${attempt}/${maxRetries}.`,
            status: 429,
            retryable: isRetryable,
            requestId: aiRequestId,
          });

          if (isRetryable) {
            await delay(waitTimeMs);
            continue;
          }
          throw lastError;
        }

        // Check authentication errors (401, 403)
        if (response.status === 401 || response.status === 403) {
          throw new AgnesError({
            code: 'AI_AUTH_ERROR',
            message: `Agnes API authentication failed with HTTP status ${response.status}.`,
            status: response.status,
            retryable: false,
            requestId: aiRequestId,
          });
        }

        // Check server / transient errors (500, 502, 503, 504)
        if (response.status >= 500) {
          const isRetryable = attempt < maxRetries;
          lastError = new AgnesError({
            code: 'AI_PROVIDER_ERROR',
            message: `Agnes API server error (HTTP ${response.status}). Attempt ${attempt}/${maxRetries}.`,
            status: response.status,
            retryable: isRetryable,
            requestId: aiRequestId,
          });

          if (isRetryable) {
            const backoff = Math.min(500 * Math.pow(2, attempt - 1), 5000);
            await delay(backoff);
            continue;
          }
          throw lastError;
        }

        // Check other HTTP client errors (400, 404, 422, etc.)
        if (!response.ok) {
          let errText = '';
          try {
            errText = await response.text();
          } catch {
            // Ignore text read failure
          }
          throw new AgnesError({
            code: 'AI_PROVIDER_ERROR',
            message: `Agnes API responded with HTTP ${response.status}: ${errText.slice(0, 300)}`,
            status: response.status,
            retryable: false,
            requestId: aiRequestId,
          });
        }

        // Parse JSON payload from provider
        const rawBody = (await response.json()) as AgnesRawResponse;
        const messageContent = rawBody.choices?.[0]?.message?.content;

        if (!messageContent || typeof messageContent !== 'string') {
          throw new AgnesError({
            code: 'AI_INVALID_RESPONSE',
            message: 'Agnes API returned empty content in choices[0].message.',
            status: 502,
            retryable: false,
            requestId: aiRequestId,
          });
        }

        // Parse extracted JSON content
        const parsedJson = extractJsonFromResponse(messageContent);

        // Validate parsed object against the required Zod schema
        const schemaResult = schema.safeParse(parsedJson);
        if (!schemaResult.success) {
          const zodErrors = schemaResult.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');

          throw new AgnesError({
            code: 'AI_INVALID_RESPONSE',
            message: `Agnes response failed schema validation: ${zodErrors}`,
            status: 502,
            retryable: false,
            requestId: aiRequestId,
          });
        }

        const durationMs = Date.now() - startTime;

        return {
          data: schemaResult.data,
          rawText: messageContent,
          usage: rawBody.usage,
          requestId: aiRequestId,
          model: this.config.model,
          durationMs,
        };
      } catch (err: unknown) {
        clearTimeout(timeoutTimer);

        const normalized = normalizeAgnesError(err, aiRequestId);
        console.log('[DEBUG AgnesClient Catch]', err, 'Normalized Code:', normalized.code);
        // If it's a non-retryable error (e.g. auth, invalid schema, client bad request), throw immediately
        if (!normalized.retryable || attempt >= maxRetries) {
          throw normalized;
        }

        lastError = normalized;
        const backoff = Math.min(500 * Math.pow(2, attempt - 1), 5000);
        await delay(backoff);
      }
    }

    throw lastError || new AgnesError({
      code: 'AI_UNKNOWN_ERROR',
      message: 'Agnes completion request failed after maximum retry attempts.',
      status: 500,
      requestId: aiRequestId,
    });
  }
}

/**
 * Singleton instance of AgnesClient initialized with environment configuration.
 */
export const agnesClient = new AgnesClient();
