/**
 * Retry utility for handling transient failures.
 */

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (string | RegExp)[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

function isRetryableError(
  error: Error,
  retryableErrors?: (string | RegExp)[]
): boolean {
  if (!retryableErrors || retryableErrors.length === 0) {
    const errorMessage = error.message.toLowerCase();
    const defaultRetryable = [
      'rate limit',
      'too many requests',
      'timeout',
      'econnreset',
      'econnrefused',
      'network',
      '503',
      '502',
      '429',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ];
    return defaultRetryable.some(keyword =>
      errorMessage.includes(keyword.toLowerCase())
    );
  }
  return retryableErrors.some(pattern => {
    if (typeof pattern === 'string') {
      return error.message.toLowerCase().includes(pattern.toLowerCase());
    }
    return pattern.test(error.message);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts) {
        break;
      }

      if (!isRetryableError(lastError, opts.retryableErrors)) {
        throw lastError;
      }

      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}
