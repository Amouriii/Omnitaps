/**
 * Transient-database-error classifier and retry helper.
 *
 * The remote Supabase pooler routinely needs 3–6s for a cold connection
 * handshake, which spikes past Prisma's connect window and surfaces as P1001
 * ("Can't reach database server") even though the database is healthy. These
 * failures are transient and safe to retry: only the *connection setup* failed,
 * never the query itself (the query never ran).
 */

const TRANSIENT_PRISMA_CODES = new Set([
  "P1001", // Can't reach database server
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a connection from the pool
]);

const TRANSIENT_MESSAGE_MARKERS = [
  "can't reach database server",
  "connection terminated",
  "connection refused",
  "connection reset",
  "server has closed the connection",
  "timed out fetching a new connection",
  "econnreset",
  "etimedout",
  "econnrefused",
  "socket hang up",
];

export function isTransientDbError(error) {
  if (!error) return false;
  if (TRANSIENT_PRISMA_CODES.has(error.code)) return true;

  const message = String(error.message ?? "");
  if (!message) return false;
  const lowered = message.toLowerCase();
  return TRANSIENT_MESSAGE_MARKERS.some((marker) => lowered.includes(marker));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn` with retries on transient connection errors. Backs off
 * exponentially with jitter: ~baseDelay, ~2*baseDelay, ...
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {object} [options]
 * @param {number} [options.retries=2] retry attempts after the first failure
 * @param {number} [options.baseDelayMs=150]
 * @param {(error: unknown, attempt: number) => void} [options.onRetry]
 * @returns {Promise<T>}
 */
export async function withDbRetry(fn, options = {}) {
  const { retries = 2, baseDelayMs = 150, onRetry } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !isTransientDbError(error)) {
        throw error;
      }
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 100;
      onRetry?.(error, attempt + 1);
      await sleep(delay);
    }
  }
  /* c8 ignore next */
  throw lastError;
}
