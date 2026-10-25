/**
 * lib/logger.ts — Safe structured logger.
 *
 * All application logging goes through this module. It redacts sensitive
 * fields (tokens, secrets, passwords, emails, cookies) from any logged
 * data and outputs structured JSON in production for easy parsing.
 *
 * ESLint `no-console` is set to error — this logger is the only allowed
 * way to write to stdout/stderr.
 */

const SENSITIVE_PATTERN =
  /token|secret|key|authorization|cookie|password|email|credential/i;

/**
 * Recursively redacts sensitive keys from an object. Returns a new
 * copy — the original is never mutated.
 */
function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        if (SENSITIVE_PATTERN.test(key)) {
          Object.assign(result, { [key]: "[REDACTED]" });
        } else {
          const val = (value as Record<string, unknown>)[String(key)];
          Object.assign(result, { [key]: redact(val) });
        }
      }
    }
    return result;
  }

  return String(value);
}

interface LogEntry {
  level: "info" | "warn" | "error";
  event: string;
  status?: string;
  route?: string;
  requestId?: string;
  [key: string]: unknown;
}

function formatLog(entry: LogEntry): string {
  const redacted = redact(entry) as Record<string, unknown>;
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(redacted);
  }
  // In development, use a readable format
  const { level, event, ...rest } = redacted;
  const parts = [`[${String(level).toUpperCase()}] ${event}`];
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) {
      parts.push(`${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
  }
  return parts.join(" | ");
}

/**
 * The application logger. Only export — use `logger.info(...)`,
 * `logger.warn(...)`, or `logger.error(...)`.
 */
export const logger = {
  info(event: string, data?: Omit<LogEntry, "level" | "event">) {
    // eslint-disable-next-line no-console
    console.log(formatLog({ level: "info", event, ...data }));
  },

  warn(event: string, data?: Omit<LogEntry, "level" | "event">) {
    // eslint-disable-next-line no-console
    console.warn(formatLog({ level: "warn", event, ...data }));
  },

  error(event: string, data?: Omit<LogEntry, "level" | "event">) {
    // eslint-disable-next-line no-console
    console.error(formatLog({ level: "error", event, ...data }));
  },
};
