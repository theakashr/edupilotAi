/**
 * src/services/ai/agnes/agnesErrors.ts
 *
 * Normalized error categories and custom error class for the Agnes 3.0 Flash AI integration.
 * Ensures all internal provider details and secrets remain hidden from client-side errors,
 * while providing clear, typed diagnostic codes and user-safe messages.
 */

export type AIErrorCode =
  | 'AI_AUTH_ERROR'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_NETWORK_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'AI_INVALID_RESPONSE'
  | 'AI_CONFIGURATION_ERROR'
  | 'AI_UNKNOWN_ERROR';

/**
 * Returns user-facing, non-leaking error messages mapped to normalized error codes.
 */
export function getSafeUserMessage(code: AIErrorCode): string {
  switch (code) {
    case 'AI_AUTH_ERROR':
      return 'AI service authentication failed. Please contact your system administrator.';
    case 'AI_RATE_LIMITED':
      return 'AI service is temporarily busy. Please try again in a few moments.';
    case 'AI_TIMEOUT':
      return 'AI request timed out. Please try again.';
    case 'AI_NETWORK_ERROR':
      return 'Unable to reach the AI service. Network or connection failed.';
    case 'AI_PROVIDER_ERROR':
      return 'The AI provider encountered an issue while processing your request. Please try again later.';
    case 'AI_INVALID_RESPONSE':
      return 'AI service returned an unparseable or unexpected response format.';
    case 'AI_CONFIGURATION_ERROR':
      return 'AI service is not configured yet.';
    case 'AI_UNKNOWN_ERROR':
    default:
      return 'An unexpected error occurred while processing the AI request.';
  }
}

export interface AgnesErrorParams {
  code: AIErrorCode;
  message: string;
  status?: number;
  retryable?: boolean;
  requestId?: string;
  safeUserMessage?: string;
  cause?: unknown;
}

export class AgnesError extends Error {
  readonly code: AIErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly requestId?: string;
  readonly safeUserMessage: string;

  constructor(params: AgnesErrorParams) {
    super(params.message);
    this.name = 'AgnesError';
    this.code = params.code;
    this.status = params.status ?? 500;
    this.retryable = params.retryable ?? false;
    this.requestId = params.requestId;
    this.safeUserMessage = params.safeUserMessage ?? getSafeUserMessage(params.code);
    if (params.cause) {
      this.cause = params.cause;
    }
    Object.setPrototypeOf(this, AgnesError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.safeUserMessage,
      status: this.status,
      retryable: this.retryable,
      requestId: this.requestId,
    };
  }
}

/**
 * Normalizes any unknown thrown error into an AgnesError.
 */
export function normalizeAgnesError(err: unknown, requestId?: string): AgnesError {
  if (err instanceof AgnesError) {
    return err;
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    // Check for Abort / Timeout errors
    if (err.name === 'AbortError' || msg.includes('abort') || msg.includes('timeout')) {
      return new AgnesError({
        code: 'AI_TIMEOUT',
        message: err.message,
        status: 504,
        retryable: true,
        requestId,
      });
    }

    // Check for Network / Connection errors (DNS failure, fetch failed, connection refused)
    if (
      msg.includes('enotfound') ||
      msg.includes('econnrefused') ||
      msg.includes('ehostunreach') ||
      msg.includes('fetch failed') ||
      msg.includes('network')
    ) {
      return new AgnesError({
        code: 'AI_NETWORK_ERROR',
        message: err.message,
        status: 503,
        retryable: true,
        requestId,
      });
    }

    return new AgnesError({
      code: 'AI_UNKNOWN_ERROR',
      message: err.message,
      status: 500,
      retryable: false,
      requestId,
      cause: err,
    });
  }

  return new AgnesError({
    code: 'AI_UNKNOWN_ERROR',
    message: String(err),
    status: 500,
    retryable: false,
    requestId,
  });
}
