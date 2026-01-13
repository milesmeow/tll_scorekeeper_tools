# Database Performance Decisions

This document records intentional decisions about database performance optimizations that were considered and either implemented or rejected.

---

## Decision: Skip Foreign Key Indexes on games.home_team_id, games.away_team_id, games.scorekeeper_team_id

**Date**: 2026-01-12

**Supabase Performance Advisor Warning**:
> Table public.games has a foreign key games_away_team_id_fkey without a covering index. This can lead to suboptimal query performance.

### Investigation Summary

We investigated whether to add indexes on the three foreign keys in the `games` table that reference `teams`:
- `home_team_id` → teams
- `away_team_id` → teams
- `scorekeeper_team_id` → teams

**Current State**:
- ✅ `season_id` has index (`idx_games_season`)
- ✅ `game_date` has index (`idx_games_date`)
- ✅ `has_violation` has partial index (`idx_games_has_violation`)
- ❌ `home_team_id`, `away_team_id`, `scorekeeper_team_id` have NO indexes

### Analysis

**Where These Foreign Keys Are Used**:

1. **Application Queries** (frequent):
   - All queries fetch games by `season_id`, NOT by `team_id`
   - Examples: GamesListReport, PlayerAbsencesReport, GameEntry, exportUtils
   - Pattern: `.from('games').select('*').eq('season_id', seasonId)`
   - Filtering by team happens in JavaScript after fetching all season games
   - **Indexes would NOT improve these queries**

2. **JOIN Operations** (frequent):
   - Multiple queries join `games → teams` to fetch team names/divisions
   - Example: `home_team:teams!games_home_team_id_fkey(name, division)`
   - Since we fetch ALL games for a season, PostgreSQL does full scan by `season_id`
   - Lookups use `teams` primary key, not `games` foreign key index
   - **Indexes would NOT significantly improve JOINs**

3. **Team Deletion Validation** (rare):
   - `TeamManagement.jsx:140` checks if team has associated games before deletion
   - Query: `.or('home_team_id.eq.${teamId},away_team_id.eq.${teamId},scorekeeper_team_id.eq.${teamId}')`
   - This is the ONLY query that filters games by team_id
   - Used only when deleting teams (end of season cleanup)
   - **Indexes would improve this, but it's very rare**

4. **RLS Policies** (every query):
   - "Coaches can manage team games" policy checks team_coaches JOIN
   - Pattern: `WHERE (tc.team_id = games.home_team_id OR tc.team_id = games.away_team_id)`
   - However, `team_coaches.team_id` already has index (`idx_team_coaches_team`)
   - RLS performance impact is minimal
   - **Indexes might help slightly, but not critical**

5. **Foreign Key Constraint Enforcement** (on DELETE team):
   - PostgreSQL checks `ON DELETE RESTRICT` when deleting teams
   - Requires scanning games table for references
   - Very rare operation (end of season cleanup only)
   - **Indexes would help, but operation is rare**

### Trade-offs

**Benefits of Adding Indexes**:
- ✅ Faster team deletion validation (rare operation)
- ✅ Faster foreign key constraint checks (rare operation)
- ✅ Slightly better RLS policy performance (marginal benefit)
- ✅ Satisfies Supabase Performance Advisor warning
- ✅ Follows "foreign keys should have indexes" best practice

**Costs of Adding Indexes**:
- ❌ Write overhead on EVERY game INSERT/UPDATE/DELETE (frequent during season)
  - Currently: 4 indexes updated per write
  - With new indexes: 7 indexes updated per write (75% increase)
- ❌ Additional storage space (~150-300KB per 1000 games for 3 indexes)
- ❌ More maintenance overhead (vacuum, analyze, reindex)
- ❌ Slower game entry and editing during active season

### Decision: Do NOT Add Indexes

**Rationale**:
1. **Usage Pattern Mismatch**: Application queries by `season_id`, not `team_id`
2. **Write-Heavy Workload**: Games are frequently created/updated during season
3. **Rare Benefit**: Only helps with team deletion (end-of-season cleanup)
4. **Optimization Priority**: Fast game entry matters more than fast team deletion

**Trade-off**: Accept slightly slower team deletion (rare) to maintain fast game writes (frequent).

### Implementation

No migration needed. Supabase Performance Advisor warning marked as "won't fix".

### Query Evidence

Verified with diagnostic queries in `database/check_games_indexes.sql`:
- Query 1: Confirmed current index state
- Query 2: Confirmed foreign key constraints exist
- Query 3: Confirmed missing indexes on home_team_id, away_team_id, scorekeeper_team_id
- Query 4: Confirmed RLS policy structure

### Code References

Application query patterns examined:
- `src/components/reports/GamesListReport.jsx:59-67` - Query by season_id
- `src/components/games/GameEntry.jsx:106-111` - Query by season_id with JOINs
- `src/lib/exportUtils.js:82-85` - Query by season_id
- `src/components/teams/TeamManagement.jsx:138-141` - ONLY query by team_id (rare)
- `database/schema.sql:362-371` - RLS policy using home_team_id/away_team_id

### Future Considerations

**Reconsider adding indexes if**:
1. Application changes to query games by team_id (not just season_id)
2. Team deletion becomes frequent operation
3. Database grows to >10,000 games and deletion becomes slow
4. RLS policy performance becomes measurable bottleneck

**Alternative optimization**: If team deletion becomes slow, consider adding indexes temporarily during cleanup season, then dropping them during active season.

---

## Related Documentation

- `database/check_games_indexes.sql` - Diagnostic queries used for analysis
- `database/schema.sql:113-140` - Games table definition and indexes
- `CLAUDE.md` - Architecture patterns and query patterns

---

## How to Use This Document

When Supabase Performance Advisor (or other tools) suggest adding these indexes:
1. Review this document
2. Verify application query patterns haven't changed
3. If patterns match this analysis, keep decision to skip indexes
4. If patterns changed significantly, reconsider and update this document
