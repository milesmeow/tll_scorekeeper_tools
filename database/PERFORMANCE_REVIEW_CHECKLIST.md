# RLS Performance Review Checklist

This checklist guides quarterly (or end-of-season) reviews of RLS policy performance.

## Background

We maintain multiple permissive RLS policies for clarity and maintainability. This monitoring ensures we catch performance degradation before it impacts users.

See `PERFORMANCE_DECISIONS.md` for full context on this decision.

---

## When to Review

- [ ] End of each season
- [ ] Quarterly (if no season boundary)
- [ ] After significant data growth
- [ ] If users report slow performance

---

## Review Steps

### 1. Check Query Performance View

Run in Supabase SQL Editor:

```sql
SELECT * FROM rls_query_performance;
```

**Record results:**

| Metric | Value |
|--------|-------|
| Date | __________ |
| Slowest avg query | _______ ms |
| Slowest max query | _______ ms |
| Queries over 100ms avg | _______ |
| Query with most calls | _______ |

### 2. Check Data Scale

Run in Supabase SQL Editor:

```sql
SELECT
  (SELECT COUNT(*) FROM games) as total_games,
  (SELECT COUNT(*) FROM players) as total_players,
  (SELECT COUNT(*) FROM pitching_logs) as total_pitching_logs,
  (SELECT COUNT(*) FROM game_players) as total_game_players,
  (SELECT COUNT(*) FROM positions_played) as total_positions_played;
```

**Record results:**

| Table | Count |
|-------|-------|
| games | _______ |
| players | _______ |
| pitching_logs | _______ |
| game_players | _______ |
| positions_played | _______ |

### 3. Check Supabase Dashboard

Navigate to: Database → Query Performance

- [ ] Dashboard reviewed
- [ ] Any queries consistently >200ms? _______
- [ ] Connection pool usage normal? _______
- [ ] Any queries with high call count AND high avg time? _______

### 4. Compare to Thresholds

Reference thresholds from `PERFORMANCE_DECISIONS.md`:

| Metric | Current | Monitor | Warning | Action Required | **Your Value** |
|--------|---------|---------|---------|-----------------|----------------|
| Avg query time | ~45ms | >75ms | >100ms | >200ms | _______ |
| Max query time | ~150ms | >250ms | >500ms | >1000ms | _______ |
| Games per season | ~500 | >2,000 | >5,000 | >10,000 | _______ |

### 5. Make Decision

Based on thresholds:

- [ ] **All clear** - No action needed, continue monitoring
- [ ] **Monitor** - Note concerns below, review sooner (6 weeks)
- [ ] **Warning** - Investigate specific queries, document findings
- [ ] **Action Required** - Plan policy consolidation, create task

**Notes/Concerns:**

```
(Write any observations here)
```

---

## 6. Document Review

Add entry to `PERFORMANCE_DECISIONS.md` Review Log:

```markdown
| 2026-XX-XX | [Your Name] | XXms | XXX games | All clear/Monitor/Warning/Action |
```

---

## If Action Required

If performance has degraded to "Action Required" threshold:

1. **Identify worst offenders**: Which specific queries are slowest?
2. **Review consolidation options**: See `PERFORMANCE_DECISIONS.md` "Example of Current vs Combined"
3. **Test before deploying**: Consolidate one table's policies and measure improvement
4. **Document changes**: Update `PERFORMANCE_DECISIONS.md` with new decision

### Quick Consolidation Test

To test consolidating policies on one table (e.g., games):

```sql
-- 1. Reset stats to get fresh baseline
SELECT reset_query_stats();

-- 2. Run typical queries for 1 hour
-- 3. Record baseline metrics

-- 4. Create consolidated policy (on test/staging first!)
-- 5. Reset stats again
-- 6. Run same queries for 1 hour
-- 7. Compare metrics
```

---

## Reset Statistics (Optional)

If you've made RLS policy changes and want fresh measurements:

```sql
-- Only super_admins can run this
SELECT reset_query_stats();
```

**Note**: This clears ALL query statistics. Only reset if:
- You've deployed RLS policy changes
- You want fresh measurements for comparison
- You're starting a new monitoring period

---

## Template: Copy for Each Review

```markdown
## Review: YYYY-MM-DD

**Reviewer**: [Name]

### Query Performance
- Slowest avg: ___ms
- Slowest max: ___ms
- Queries >100ms avg: ___

### Data Scale
- Games: ___
- Players: ___
- Pitching logs: ___

### Decision
[ ] All clear / [ ] Monitor / [ ] Warning / [ ] Action

### Notes
(Any observations or concerns)
```
