# Database Documentation

## Initial Setup

The schema was initially created but ran into RLS (Row Level Security) issues when trying to login as a user in the app. The schema was updated to use a three-layer RLS architecture to prevent infinite recursion (see schema.sql for details).

## Supabase Edge Function

The `create-user` edge function allows super admins to create user accounts from the app, using the service role key to access `auth.users` table securely.

## Index Optimization Decisions

This section documents decisions about database indexes based on Supabase performance recommendations.

### Removed Indexes (Jan 2026)

#### `idx_positions_position` on `positions_played(position)`
**Status**: Removed

**Reason**: Index was never used in any application queries
- No queries filter by the `position` column (always filters by `game_id` or `player_id`)
- Very low cardinality (only 2 values: 'pitcher', 'catcher')
- Application performs filtering in JavaScript after fetching data
- Removing improves INSERT/UPDATE performance and reduces storage overhead

**SQL to remove from existing databases**:
```sql
DROP INDEX IF EXISTS public.idx_positions_position;
```

#### `idx_players_age` on `players(age)`
**Status**: Removed

**Reason**: Index was never used in any application queries
- No queries filter by the `age` column (always filters by `team_id`)
- Age is only used for:
  - Display in UI (rosters, game entry forms)
  - Client-side validation (calculating max pitch counts in JavaScript)
- All player queries use pattern: "Get all players for team X" then use age in JavaScript
- Never queries like "Find all 12-year-old players" or "Group by age"
- Removing improves INSERT/UPDATE performance (especially bulk CSV imports)

**SQL to remove from existing databases**:
```sql
DROP INDEX IF EXISTS public.idx_players_age;
```

#### `idx_games_home_team` and `idx_games_away_team` on `games(home_team_id)` and `games(away_team_id)`
**Status**: Removed

**Reason**: Following "add indexes when needed" principle - current query patterns don't require these indexes

**Analysis**:
- **Query patterns**: All game queries follow one of these patterns:
  1. Filter by `season_id` first (indexed), then JOIN to teams for display
  2. Team deletion check uses `.or()` with `.limit(1)` (rare operation, fast enough without index)
  3. JavaScript filtering in exports (after data is fetched)
- **Never queries**: "Show me all games where home_team = Team X" without filtering by season first
- **Foreign key JOINs**: Work fine without indexes on the referencing column (games side)
- **Small dataset**: Hundreds of games, not millions - sequential scans are fast

**Trade-offs**:
- ✅ Faster INSERT/UPDATE operations (2 fewer indexes to maintain)
- ✅ Reduced storage overhead
- ✅ Cleaner schema (only indexes that are actually used)
- ❌ Team deletion check slightly slower (negligible with current data size)

**When to add them back**:
- Building a "Team Dashboard" that filters games by specific team without season filter
- Game count exceeds 10,000+ and team-based queries become measurably slow
- New features require frequent filtering by home_team_id or away_team_id

**SQL to remove from existing databases**:
```sql
DROP INDEX IF EXISTS public.idx_games_home_team;
DROP INDEX IF EXISTS public.idx_games_away_team;
```

**Philosophy**: This follows the YAGNI principle (You Aren't Gonna Need It). Add indexes when you measure a performance problem, not speculatively. Adding indexes later is easy and non-blocking.

### Declined Indexes (Jan 2026)

#### `idx_games_scorekeeper_team` on `games(scorekeeper_team_id)`
**Status**: Declined (not added)

**Reason**: Cost outweighs benefit for current application scale

**Analysis**:
- **Query usage**: Only 2 use cases
  1. Team deletion check: Uses `.limit(1)` so stops after finding one record (rare operation)
  2. Foreign key joins: Used when displaying game lists (already filtered by season/date first)

- **Data characteristics**:
  - Many games have NULL `scorekeeper_team_id` (scorekeeper not assigned to a team)
  - Dataset size: Hundreds to low thousands of games (not millions)
  - Queries already filter by season/date before joining scorekeeper team

- **Trade-offs**:
  - ✅ Slightly faster JOINs when loading game lists
  - ❌ Slower INSERT/UPDATE operations (index maintenance overhead)
  - ❌ Additional storage space

**Recommendation**: Add this index only if:
- Game count exceeds 10,000+ records
- Queries frequently filter or group by `scorekeeper_team_id` specifically
- JOIN performance becomes measurably slow

**Note**: Supabase flags this as a best practice for large-scale applications, but our application size doesn't warrant it yet.

#### `idx_seasons_created_by` on `seasons(created_by)`
**Status**: Column removed (Jan 2026)

**Reason**: Audit field was never used anywhere in the application

**Analysis**:
- ZERO queries filtered or joined by `created_by`
- Never displayed in UI or used in business logic
- Only set during season creation but never read
- Provided no audit trail value since it was never viewed

**Action Taken**: Removed the `created_by` column entirely from the `seasons` table
- Simplified schema (removed unused foreign key)
- Eliminated unnecessary INSERT overhead
- Reduced storage footprint

**SQL to remove from existing databases**:
```sql
ALTER TABLE public.seasons DROP COLUMN IF EXISTS created_by;
```

**Note**: This is a good example of "YAGNI" (You Aren't Gonna Need It). While audit fields CAN be valuable, they should only be added if there's a clear use case. Unused columns add complexity without benefit.
