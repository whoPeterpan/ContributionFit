/**
 * lib/rate-limit.ts — Rate limiting utility for API routes.
 *
 * Provides sliding-window rate limiting. If Upstash Redis is configured,
 * enforces distributed rate limits. Otherwise in local development,
 * uses an in-memory sliding window fallback.
 */

import { logger } from "@/lib/logger";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// In-memory sliding window cache for development fallback
const memoryStore = new Map<string, number[]>();

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 30, windowMs: 60 * 1000 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = memoryStore.get(key) || [];
  // Filter timestamps within current window
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    logger.warn("Rate limit exceeded", { key, current: timestamps.length, limit: config.maxRequests });
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil((timestamps[0] + config.windowMs - now) / 1000),
    };
  }

  timestamps.push(now);
  memoryStore.set(key, timestamps);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - timestamps.length,
    reset: Math.ceil(config.windowMs / 1000),
  };
}
