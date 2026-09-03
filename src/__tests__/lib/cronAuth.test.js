import { describe, it, expect } from 'vitest'
import { isAuthorizedCronRequest } from '../../lib/cronAuth'

// Fake fixture, NOT a real credential — a hand-typed hex pattern, deliberately
// not the output of `openssl rand -hex 32`. The real CRON_SECRET lives only in
// Vercel's environment variables and is never read by these tests:
// isAuthorizedCronRequest() takes the secret as an argument rather than reading
// process.env, which is exactly what makes the "secret is undefined" cases below
// testable without mutating global env state.
const SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

describe('isAuthorizedCronRequest', () => {
  describe('fails closed when the secret is not configured', () => {
    // These are the tests that matter. The naive check
    // (`token !== process.env.CRON_SECRET`) passes every other case in this
    // file but fails HERE -- with the env var unset, `undefined !== undefined`
    // is false, so a request with no token at all would be authorized. A
    // dropped env var must lock the endpoint, not open it.

    it('rejects when the secret is undefined, even with a plausible token', () => {
      expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, undefined)).toBe(false)
    })

    it('rejects when the secret is undefined and no header is sent', () => {
      expect(isAuthorizedCronRequest(undefined, undefined)).toBe(false)
    })

    it('rejects when the secret is an empty string', () => {
      expect(isAuthorizedCronRequest('Bearer ', '')).toBe(false)
      expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, '')).toBe(false)
    })

    it('rejects when the secret is null', () => {
      expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, null)).toBe(false)
    })
  })

  describe('with a configured secret', () => {
    it('authorizes the correct bearer token', () => {
      expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true)
    })

    it('rejects a wrong token of the same length', () => {
      const wrong = 'f0e1d2c3b4a59687766554433221100f'
      expect(wrong).toHaveLength(SECRET.length)
      expect(isAuthorizedCronRequest(`Bearer ${wrong}`, SECRET)).toBe(false)
    })

    it('rejects a token of a different length without throwing', () => {
      // timingSafeEqual throws on length-mismatched buffers; hashing both
      // sides to a fixed 32 bytes is what keeps this from becoming a crash
      // (or a length-leaking early return).
      expect(() => isAuthorizedCronRequest('Bearer x', SECRET)).not.toThrow()
      expect(isAuthorizedCronRequest('Bearer x', SECRET)).toBe(false)
      expect(isAuthorizedCronRequest(`Bearer ${SECRET}${SECRET}`, SECRET)).toBe(
        false
      )
    })

    it('rejects a token that is a prefix of the secret', () => {
      expect(
        isAuthorizedCronRequest(`Bearer ${SECRET.slice(0, -1)}`, SECRET)
      ).toBe(false)
    })

    it('rejects a missing Authorization header', () => {
      expect(isAuthorizedCronRequest(undefined, SECRET)).toBe(false)
      expect(isAuthorizedCronRequest(null, SECRET)).toBe(false)
      expect(isAuthorizedCronRequest('', SECRET)).toBe(false)
    })

    it('rejects the bare secret without the Bearer scheme', () => {
      expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false)
    })

    it('rejects a non-Bearer auth scheme carrying the secret', () => {
      expect(isAuthorizedCronRequest(`Basic ${SECRET}`, SECRET)).toBe(false)
      expect(isAuthorizedCronRequest(`bearer ${SECRET}`, SECRET)).toBe(false)
    })

    it('rejects a Bearer header with no token', () => {
      expect(isAuthorizedCronRequest('Bearer', SECRET)).toBe(false)
      expect(isAuthorizedCronRequest('Bearer ', SECRET)).toBe(false)
      expect(isAuthorizedCronRequest('Bearer    ', SECRET)).toBe(false)
    })

    it('tolerates surrounding whitespace on the token', () => {
      expect(isAuthorizedCronRequest(`Bearer  ${SECRET} `, SECRET)).toBe(true)
    })

    it('rejects non-string header values', () => {
      expect(isAuthorizedCronRequest(42, SECRET)).toBe(false)
      expect(isAuthorizedCronRequest(['Bearer', SECRET], SECRET)).toBe(false)
      expect(isAuthorizedCronRequest({}, SECRET)).toBe(false)
    })
  })
})
