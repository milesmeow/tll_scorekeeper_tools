/**
 * Authorization for scheduled (cron) requests to serverless endpoints.
 *
 * NODE-ONLY MODULE. Depends on `node:crypto`, so it must never be imported
 * from anything under `src/components/` -- it is consumed exclusively by
 * `api/cron/keep-alive.js`, which runs as a Vercel Node function. It lives in
 * `src/lib/` (rather than beside the handler) to follow the repo's utilities
 * convention and to keep its tests in `src/__tests__/lib/`. Vite never bundles
 * it because no client module imports it.
 */

import { createHash, timingSafeEqual } from 'node:crypto'

const BEARER_PREFIX = 'Bearer '

/**
 * Extract the token from an `Authorization: Bearer <token>` header.
 *
 * @param {string|undefined|null} authHeader - Raw Authorization header value
 * @returns {string|null} The token, or null if the header is absent/malformed
 */
function extractBearerToken(authHeader) {
  if (typeof authHeader !== 'string') return null
  if (!authHeader.startsWith(BEARER_PREFIX)) return null

  const token = authHeader.slice(BEARER_PREFIX.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Check whether a request carries the correct cron secret.
 *
 * Two properties matter here, and both are easy to get wrong:
 *
 * 1. FAILS CLOSED. Returns false when `secret` is missing or empty, before any
 *    comparison happens. The obvious version of this check --
 *    `token !== process.env.CRON_SECRET` -- fails OPEN: with the env var unset,
 *    `undefined !== undefined` is false, so a request sending no token at all
 *    would be authorized. A dropped env var would silently open the endpoint.
 *
 * 2. TIMING-SAFE. Compares SHA-256 digests rather than the raw strings.
 *    `timingSafeEqual` throws on length-mismatched buffers, and guarding that
 *    with an early length check would leak the secret's length; digests are
 *    always 32 bytes, so the comparison is both safe and constant-shape.
 *
 * @param {string|undefined|null} authHeader - Raw Authorization header value
 * @param {string|undefined|null} secret - Expected secret (process.env.CRON_SECRET)
 * @returns {boolean} True only if the header carries exactly the secret
 *
 * @example
 * isAuthorizedCronRequest('Bearer s3cr3t', 's3cr3t')  // true
 * isAuthorizedCronRequest('Bearer s3cr3t', undefined) // false (fails closed)
 * isAuthorizedCronRequest(undefined, 's3cr3t')        // false
 */
export function isAuthorizedCronRequest(authHeader, secret) {
  // Fail closed: no configured secret means nothing can be authorized.
  if (typeof secret !== 'string' || secret.length === 0) return false

  const token = extractBearerToken(authHeader)
  if (token === null) return false

  const tokenDigest = createHash('sha256').update(token).digest()
  const secretDigest = createHash('sha256').update(secret).digest()

  return timingSafeEqual(tokenDigest, secretDigest)
}
