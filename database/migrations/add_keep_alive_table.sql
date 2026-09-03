-- =====================================================
-- MIGRATION: Add keep_alive table + ping function
-- Date: 2026-09-02
-- Purpose: Prevent Supabase from pausing the free-tier project
-- =====================================================
--
-- Supabase pauses free-tier projects after ~7 days without database
-- activity. A scheduled job (Vercel Cron + cron-job.org) hits
-- /api/cron/keep-alive once a day, which calls record_keep_alive_ping()
-- below. One row, one column, one UPDATE per day.
--
-- Why a WRITE and not a read (e.g. `select count(*)`)? A read probably
-- counts as activity too, but "probably" is worth nothing here: if it
-- didn't, the failure would be silent for a full 7 days. A write also
-- leaves last_ping behind as durable proof the request actually reached
-- Postgres -- an HTTP 200 only proves that *something* answered.
--
-- This migration is idempotent; re-running it in the SQL editor is safe.
-- =====================================================

BEGIN;

-- =====================================================
-- Singleton table
-- =====================================================
-- id SMALLINT + DEFAULT 1 + CHECK (id = 1) means this table can never
-- accumulate rows, however often it is pinged. There is nothing to prune,
-- ever, and no scheduled cleanup to forget about.
CREATE TABLE IF NOT EXISTS public.keep_alive (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_keep_alive_row CHECK (id = 1)
);

COMMENT ON TABLE public.keep_alive IS
  'Singleton row touched daily by the keep-alive cron so Supabase does not
   pause the free-tier project. Written only via record_keep_alive_ping().';

COMMENT ON COLUMN public.keep_alive.last_ping IS
  'Timestamp of the most recent successful ping. Ground truth for
   verification: select last_ping, now() - last_ping as age from keep_alive;';

-- Seed the one and only row
INSERT INTO public.keep_alive (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Row Level Security: ENABLED, with ZERO policies
-- =====================================================
-- This is deliberate, not an oversight. RLS with no policies denies every
-- PostgREST role outright, while:
--   - record_keep_alive_ping() still writes (SECURITY DEFINER runs as owner)
--   - the SQL editor still reads (runs as postgres, exempt from RLS)
--
-- Skipping this line would leave the table world-readable AND world-writable:
-- Supabase grants anon/authenticated access to new public tables by default,
-- and our anon key ships inside the browser bundle. Do not add policies.
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Ping function
-- =====================================================
-- SECURITY DEFINER is what lets the cron route use the *anon* key instead of
-- the service-role key. An endpoint reachable without a session should not be
-- holding a key that bypasses RLS on every table in the database.
--
-- SET search_path = public hardens the definer function against search_path
-- hijacking (and is what Supabase's security advisor flags without it).
CREATE OR REPLACE FUNCTION public.record_keep_alive_ping()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_ping TIMESTAMPTZ;
BEGIN
  UPDATE public.keep_alive
  SET last_ping = NOW()
  WHERE id = 1
  RETURNING last_ping INTO v_last_ping;

  RETURN v_last_ping;
END;
$$;

COMMENT ON FUNCTION public.record_keep_alive_ping IS
  'Stamps keep_alive.last_ping with now() and returns it. Called daily by the
   /api/cron/keep-alive route using the anon key. now() is evaluated here, in
   Postgres, so an advancing return value proves the database was reached --
   a rewrite, a CDN cache, or a stubbed response cannot fake it.';

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, which would expose this
-- via /rpc/record_keep_alive_ping to every role. Revoke first, then grant only
-- to anon (the role the cron route authenticates as).
REVOKE ALL ON FUNCTION public.record_keep_alive_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_keep_alive_ping() TO anon;

COMMIT;

-- =====================================================
-- Migration complete!
--
-- Verify:
--   select last_ping, now() - last_ping as age from public.keep_alive;
--
-- Confirm RLS is doing its job (should return NO rows, not data):
--   curl -s "$VITE_SUPABASE_URL/rest/v1/keep_alive?select=*" \
--        -H "apikey: $VITE_SUPABASE_ANON_KEY"
-- =====================================================
