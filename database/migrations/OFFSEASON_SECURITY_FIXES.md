# Off-Season Maintenance: Security Advisor Fixes

**Status**: PENDING — Do not run during active season
**Priority**: Low (no live data breach risk)
**Flagged by**: Supabase Security Advisor
**Date identified**: 2026-03-01

---

## Background

Supabase Security Advisor flagged two objects in the `public` schema with `ERROR` severity. Neither represents an immediate breach, but both should be cleaned up during the off-season before the next season begins.

---

## Fix 1: Drop `rls_query_performance` View

**Advisor finding**: `security_definer_view` — View `public.rls_query_performance` has SECURITY DEFINER property
**Risk level**: Medium

**Why it's flagged**: The view was created by `enable_query_monitoring.sql` to help debug RLS policy performance overhead. PostgreSQL views that query `pg_stat_statements` silently inherit the elevated privileges of their creator (the Supabase `postgres` superuser), even though `SECURITY DEFINER` was never written explicitly. Combined with the `GRANT SELECT TO authenticated` grant, every logged-in user (coaches, admins, scorekeepers) can read truncated SQL query strings from all other users' database sessions.

**Why it's low urgency**: The leaked data is internal query patterns (e.g., `SELECT * FROM games WHERE team_id = $1`), not personal player data. All users are trusted internal staff.

**Action**: Drop the view. It was only ever a dev debugging tool and has no production use.

```sql
-- Run in Supabase SQL Editor during off-season
DROP VIEW IF EXISTS public.rls_query_performance;
```

**Note**: The `reset_query_stats()` function in the same migration is safe to keep — it has an explicit `is_super_admin()` role check before executing.

---

## Fix 2: Drop `constraint_name_var` Table

**Advisor finding**: `rls_disabled_in_public` — Table `public.constraint_name_var` has RLS disabled
**Risk level**: Medium (unknown object, no access controls)

**Why it's flagged**: This table does not exist in `schema.sql` or any migration file. It was almost certainly created as a scratch variable in the Supabase SQL Editor during a migration experiment and never cleaned up. With RLS disabled, PostgREST exposes it to all API clients.

**Why it's low urgency**: The table is almost certainly empty and unused by the application.

**Action**: First verify it's safe to drop, then drop it.

```sql
-- Step 1: Verify the table is empty (run in Supabase SQL Editor)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'constraint_name_var' AND table_schema = 'public';

SELECT COUNT(*) FROM public.constraint_name_var;

-- Step 2: Drop it
DROP TABLE IF EXISTS public.constraint_name_var;
```

---

## Verification After Fixes

1. Open Supabase Dashboard → **Database → Security Advisor**
2. Re-run the scan — the two `ERROR` entries should be gone
3. Smoke-test the app (login, view games, run a report) — neither object is used by the React app

---

## Related Files

- [`database/migrations/enable_query_monitoring.sql`](enable_query_monitoring.sql) — Created the `rls_query_performance` view (no changes needed to this file after the drop)
- [`database/schema.sql`](../schema.sql) — `constraint_name_var` is NOT in this file (confirms it was ad-hoc)
