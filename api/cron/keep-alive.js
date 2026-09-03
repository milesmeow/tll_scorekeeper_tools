/**
 * Supabase keep-alive endpoint.
 *
 * Supabase pauses free-tier projects after ~7 days without database activity.
 * A scheduler hits this route once a day; it writes one timestamp and gets out.
 *
 * This is a Vercel Node function, NOT part of the Vite app -- Vercel picks up a
 * root-level `api/` directory for any framework preset. `vite dev` does not
 * serve it, so local verification is via the unit tests on `cronAuth`; the HTTP
 * behaviour is verified against a Vercel preview deployment.
 *
 * IMPORTANT: this path is exempted from the SPA catch-all rewrite in
 * vercel.json. Without that exemption the scheduler would receive 200 +
 * index.html, the database would never be touched, and every dashboard would
 * report success while the project paused anyway.
 *
 * @see database/migrations/add_keep_alive_table.sql
 * @see src/lib/cronAuth.js
 */

import { createClient } from '@supabase/supabase-js'
import { isAuthorizedCronRequest } from '../../src/lib/cronAuth.js'

// Vercel exposes every project env var to functions at runtime; the VITE_
// prefix only governs Vite's client-side inlining, so the vars this project
// already has configured work as-is. The unprefixed names are checked first so
// a server-only variable can be introduced later without touching this file.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

// ANON key, deliberately -- never the service role key. This endpoint is
// reachable without a session, so the token check would be the only thing
// standing between the internet and a key that bypasses RLS on every table.
// record_keep_alive_ping() is SECURITY DEFINER precisely so we don't need one.
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  // Never let a CDN serve a cached 200 in place of a real database write.
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  // Vercel Cron attaches `Authorization: Bearer $CRON_SECRET` automatically,
  // but only when the env var is named exactly CRON_SECRET. cron-job.org sends
  // the same header, configured by hand.
  if (!isAuthorizedCronRequest(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('keep-alive: missing Supabase environment variables')
    return res.status(500).json({ ok: false, error: 'Server misconfigured' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data, error } = await supabase.rpc('record_keep_alive_ping')

  // Return 500 on a database error rather than swallowing it. A route that
  // always answers 200 turns the scheduler's failure alerting into decoration
  // -- which is the whole failure mode this feature exists to avoid.
  if (error) {
    console.error('keep-alive: ping failed', error)
    return res.status(500).json({ ok: false, error: error.message })
  }

  return res.status(200).json({ ok: true, lastPing: data })
}
