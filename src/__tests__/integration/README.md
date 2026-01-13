# Integration Tests

This directory contains integration tests that query the **REAL Supabase database** instead of using mocks.

## Why Integration Tests?

- Verify queries work against actual PostgreSQL database
- Test Row-Level Security (RLS) policies with real data
- Validate foreign key relationships and constraints
- Ensure data transformations work correctly
- Test actual query performance

## Prerequisites

### 1. Environment Variables

Create a `.env.test` file in the project root with your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Test Season in Database

You need a dedicated test season in your database with known data:

**Required Data:**
- A season named "Test Season" (or update `TEST_DATA.SEASON_NAME` in `setup.js`)
- At least 1-2 teams in that season
- At least 2-3 players on those teams
- At least 1 game with game data (optional but recommended)
- At least 1 coach user assigned to a team (for coach assignment tests)

**Creating Test Data:**

You can create test data using the application UI:

1. **Create Test Season:**
   - Go to Seasons → Add Season
   - Name: "Test Season"
   - Start Date: Any date
   - Is Active: Can be true or false

2. **Create Test Teams:**
   - Go to Teams → Add Team
   - Add 2-3 teams in different divisions (Training, Minor, Major)

3. **Create Test Players:**
   - Go to Players → Add Player
   - Add 2-3 players per team

4. **Create Test Game (Optional):**
   - Go to Games → Add Game
   - Create a game between two test teams
   - Add player attendance and pitch counts

5. **Create Test Coach (Optional):**
   - Go to Users → Add User
   - Role: Coach
   - Then go to Teams → Edit Team → Assign Coach

## Running Integration Tests

### Run All Integration Tests

```bash
# Load env variables and run integration tests
npm run test:integration
```

### Run Specific Integration Test File

```bash
# Run only exportUtils integration tests
npx vitest run src/__tests__/integration/exportUtils.integration.test.js

# Run only coach assignments integration tests
npx vitest run src/__tests__/integration/coachAssignments.integration.test.js
```

### Run in Watch Mode

```bash
# Watch mode for development
npx vitest src/__tests__/integration/
```

## Test Files

### `setup.js`

- Configures integration test environment
- Creates real Supabase client (not mocked)
- Loads test season data from database
- Provides `TEST_DATA` constants for use in tests

### `exportUtils.integration.test.js`

Tests for `fetchSeasonData()` function:
- ✅ Fetches complete season data from real database
- ✅ Verifies data sorting (teams, players, games)
- ✅ Tests season filtering
- ✅ Verifies foreign key joins (team_coaches -> user_profiles)
- ✅ Validates referential integrity between tables
- ✅ Checks pitch count data validity
- ✅ Validates position data

### `coachAssignments.integration.test.js`

Tests for coach assignment queries:
- ✅ Fetches coach assignments with team joins
- ✅ Verifies coach is assigned to teams in test season
- ✅ Tests queries for non-coach users (admins)
- ✅ Verifies RLS policies allow viewing
- ✅ Tests unique division extraction
- ✅ Validates coach role in user_profiles
- ✅ Tests filtering teams by coach divisions

## Understanding Test Output

### Successful Run

```
✅ Integration test data loaded:
   Season: Test Season (uuid-here)
   Teams: 3
   Players: 8
   Games: 2

✓ exportUtils.integration.test.js (9 tests) 450ms
✓ coachAssignments.integration.test.js (7 tests) 320ms
```

### Skipped Tests (No Credentials)

```
⚠️  Skipping integration tests - no Supabase credentials
↓ exportUtils.integration.test.js (9 tests) - skipped
↓ coachAssignments.integration.test.js (7 tests) - skipped
```

### Missing Test Data

```
⚠️  Test season "Test Season" not found in database
   Create a test season in your database to run integration tests
```

## Best Practices

### DO:
- ✅ Use a dedicated test season that won't be deleted
- ✅ Keep test data minimal but representative
- ✅ Run integration tests before pushing to main
- ✅ Update `TEST_DATA.SEASON_NAME` if using a different season name
- ✅ Verify RLS policies work correctly with these tests

### DON'T:
- ❌ Don't modify production data in integration tests
- ❌ Don't delete test season accidentally
- ❌ Don't commit `.env.test` file (it's in .gitignore)
- ❌ Don't run integration tests in CI/CD without proper credentials
- ❌ Don't use integration tests for unit-testable logic (use unit tests for that)

## Troubleshooting

### "Missing Supabase environment variables"

**Solution:** Create `.env.test` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Test season not found in database"

**Solution:** Create a season named "Test Season" in your database, or update `TEST_DATA.SEASON_NAME` in `setup.js`

### "No test coach found - skipping test"

**Solution:** Create a coach user and assign them to a team in the test season

### Tests pass locally but fail for teammate

**Solution:** Each developer needs their own `.env.test` file (not committed to git)

### RLS policy errors

**Solution:** Verify your RLS policies allow:
- `SELECT` on all tables for authenticated users
- Proper role-based access for coaches vs admins

## Adding New Integration Tests

1. Create new test file in `src/__tests__/integration/`
2. Import setup: `import { integrationSupabase, hasSupabaseCredentials, setupTestData, TEST_DATA } from './setup'`
3. Use `describeOrSkip` to skip when no credentials: `const describeOrSkip = hasSupabaseCredentials ? describe : describe.skip`
4. Call `setupTestData()` in `beforeAll()`
5. Use `integrationSupabase` client for queries
6. Access test IDs from `TEST_DATA` constants

## CI/CD Integration (Optional)

To run integration tests in CI/CD:

1. Set up GitHub Secrets or environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Create a dedicated CI test season in your database

3. Add to your CI workflow:
   ```yaml
   - name: Run Integration Tests
     run: npm run test:integration
     env:
       VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
       VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
   ```

**Note:** Tests will be skipped if credentials are not provided, so CI won't fail without setup.
