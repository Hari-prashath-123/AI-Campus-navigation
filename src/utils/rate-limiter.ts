import { AppError } from './errors';
import { RateLimitStatus } from '../types/security';

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const rateLimiter = {
  /**
   * Evaluates if a request within a sliding window is allowed.
   *
   * @param key Unique identifier (e.g. userId, IP, or action key)
   * @param limit Maximum allowed requests in the window
   * @param windowMs Window duration in milliseconds (e.g. 60000 for 1 minute)
   */
  checkLimit: (key: string, limit: number, windowMs = 60000): RateLimitStatus => {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = rateLimitStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      rateLimitStore.set(key, record);
    }

    // Filter out timestamps outside the active sliding window
    record.timestamps = record.timestamps.filter(t => t > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const resetTimeMs = oldest + windowMs - now;
      return {
        isAllowed: false,
        remaining: 0,
        resetTimeMs: Math.max(0, resetTimeMs),
        totalLimit: limit,
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      isAllowed: true,
      remaining: limit - record.timestamps.length,
      resetTimeMs: windowMs,
      totalLimit: limit,
    };
  },

  /**
   * Enforces rate limit and throws HTTP 429 AppError if exceeded.
   */
  enforceLimit: (key: string, limit: number, windowMs = 60000, operationName = 'Action'): void => {
    const status = rateLimiter.checkLimit(key, limit, windowMs);
    if (!status.isAllowed) {
      const waitSec = Math.ceil(status.resetTimeMs / 1000);
      throw new AppError(
        `Rate limit exceeded for ${operationName}. Please try again in ${waitSec} second(s).`,
        'RATE_LIMIT_EXCEEDED',
        429,
        { limit, resetTimeMs: status.resetTimeMs }
      );
    }
  },

  /**
   * Reset store (useful for testing).
   */
  reset: (): void => {
    rateLimitStore.clear();
  },
};

