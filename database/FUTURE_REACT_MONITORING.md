# Future Enhancement: React Query Timer

## Status: NOT IMPLEMENTED (Deferred)

This document describes a potential client-side monitoring enhancement that can be added if database-level monitoring proves insufficient.

**Decision Date**: 2026-01-18
**Decision**: Defer implementation. Database monitoring via `pg_stat_statements` is sufficient at current scale.

---

## When to Implement

Consider adding React-level query timing if:

1. **Database monitoring shows queries at "Warning" threshold** (>100ms avg)
2. **You need to correlate slow queries with specific UI actions** (e.g., "clicking X is slow")
3. **You want instant feedback during development** without checking Supabase dashboard
4. **Users report slowness** but database metrics look fine (indicating network/frontend issue)

---

## Implementation Guide

### Step 1: Create Query Timer Utility

Create file: `src/lib/queryTimer.js`

```javascript
/**
 * Development-only query timing utility.
 * Wraps Supabase calls to measure and log execution time to browser console.
 * Zero overhead in production - completely removed by tree-shaking.
 *
 * Usage:
 *   const { data } = await timeQuery('fetch games', () =>
 *     supabase.from('games').select('*').eq('season_id', id)
 *   );
 */

/**
 * Wraps a Supabase query to measure and log execution time.
 * Only active in development mode - zero overhead in production.
 *
 * @param {string} name - Descriptive name for the query (e.g., 'fetch games')
 * @param {Function} queryFn - Async function that executes the Supabase query
 * @returns {Promise} - Result of the query
 */
export const timeQuery = async (name, queryFn) => {
  // In production, just execute the query without timing
  if (import.meta.env.PROD) {
    return queryFn();
  }

  const start = performance.now();
  const result = await queryFn();
  const duration = performance.now() - start;

  // Color-coded console output based on duration
  if (duration > 200) {
    console.warn(`🔴 SLOW: ${name} took ${duration.toFixed(0)}ms`);
  } else if (duration > 100) {
    console.warn(`🟡 Query: ${name} took ${duration.toFixed(0)}ms`);
  } else if (duration > 50) {
    console.log(`🟢 Query: ${name} took ${duration.toFixed(0)}ms`);
  }
  // Fast queries (<50ms) are not logged to avoid console noise

  return result;
};
```

### Step 2: Usage in Components

Wrap existing Supabase calls with `timeQuery`:

```javascript
// In any component (e.g., GameEntry.jsx)
import { timeQuery } from '../lib/queryTimer';

// BEFORE (existing code)
const { data, error } = await supabase
  .from('games')
  .select('*')
  .eq('season_id', seasonId);

// AFTER (with timing)
const { data, error } = await timeQuery('fetch season games', () =>
  supabase
    .from('games')
    .select('*')
    .eq('season_id', seasonId)
);
```

### Step 3: High-Traffic Components to Instrument

When implementing, prioritize these components:

| Component | File | Queries to Wrap |
|-----------|------|-----------------|
| GameEntry | `src/components/games/GameEntry.jsx` | Games, players, pitching logs |
| GamesListReport | `src/components/reports/GamesListReport.jsx` | Games with teams |
| PlayerManagement | `src/components/players/PlayerManagement.jsx` | Players by team |
| TeamManagement | `src/components/teams/TeamManagement.jsx` | Teams, coaches |

---

## Browser Console Output Examples

```
// Fast queries - nothing shown (reduces noise)

// Medium queries (50-100ms):
🟢 Query: fetch season games took 67ms

// Slow queries (100-200ms):
🟡 Query: fetch all players took 156ms

// Very slow queries (>200ms):
🔴 SLOW: fetch games with teams took 312ms
```

---

## Why This Approach

1. **Zero production overhead**: `import.meta.env.PROD` check is removed at build time
2. **Non-intrusive**: Wrap queries without changing their logic
3. **Console-based**: No UI changes needed, familiar developer workflow

---

## Alternative: Network Tab Monitoring

Before implementing this, you can manually check query times:

1. Open Chrome DevTools → Network tab
2. Filter by "supabase" or your Supabase URL
3. Look at "Time" column for each request

**Limitation**: Network tab shows round-trip time (network + server + serialization), not just database time.

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-01-18 | Deferred | Database monitoring (pg_stat_statements) sufficient at current scale |

---

## Related Documentation

- `database/PERFORMANCE_DECISIONS.md` - Overall performance strategy
- `database/PERFORMANCE_REVIEW_CHECKLIST.md` - Quarterly review guide
- `database/migrations/enable_query_monitoring.sql` - Database-level monitoring
