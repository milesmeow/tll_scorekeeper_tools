# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Daily Development
```bash
# Start development server (port 5173)
npm run dev

# Run tests in watch mode
npm run test

# Run tests once (CI/CD)
npm run test:run

# Visual test dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

### Running Specific Tests
```bash
# Run specific test file
npx vitest run src/__tests__/lib/violationRules.test.js

# Run tests matching pattern
npx vitest run --grep "Rule 2"

# Watch mode for specific file
npx vitest src/__tests__/lib/violationRules.test.js
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + Vite
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Routing**: React Router v7.10.1
- **Styling**: Tailwind CSS 3.4.1 (NOT v4 - breaks PostCSS)
- **Testing**: Vitest 4.0 + React Testing Library
- **Module System**: ES Modules (`"type": "module"` in package.json)

### Core Architecture Pattern

This is a **two-tier application**:
1. **Frontend (React)** - Handles UI, routing, and client-side state
2. **Backend (Supabase)** - Handles auth, database, and Row-Level Security (RLS)

**No custom API layer** - React components query Supabase directly using the Supabase JS client (`src/lib/supabase.js`).

### Role-Based Access Control

Three user roles with different permission levels:

| Role | Access Level | Default Route |
|------|--------------|---------------|
| `super_admin` | Full access + user management | `/users` |
| `admin` | Full data access (no user mgmt) | `/games` |
| `coach` | Read-only access to assigned teams | `/teams` |

**Implementation**:
- **Database Level**: Row-Level Security (RLS) policies on all tables
- **UI Level**: Route protection via `RoleBasedRedirect.jsx` component
- **Session Management**: Smart auth state in `App.jsx` prevents unnecessary re-renders on tab focus

### Three-Layer RLS Architecture (Critical)

**Problem**: RLS policies need to check user roles from `user_profiles` table, but that table also has RLS enabled → infinite recursion.

**Solution**: Three-layer architecture prevents recursion:

1. **Layer 1 (Private)**: `private.get_user_info(user_id)`
   - Uses `SET LOCAL row_security = off` to bypass RLS internally
   - SECURITY DEFINER function with revoked public access
   - Only returns role and is_active status

2. **Layer 2 (Public Helpers)**:
   - `public.is_admin()` - Returns true if user is super_admin or admin
   - `public.is_super_admin()` - Returns true if user is super_admin
   - These call `get_user_info()` instead of querying user_profiles directly

3. **Layer 3 (RLS Policies)**:
   - All tables use helper functions in their RLS policies
   - No direct `user_profiles` queries in policies
   - Breaks recursion cycle

**When modifying RLS policies**: Always use helper functions (`is_admin()`, `is_super_admin()`), never query `user_profiles` directly.

### Validation Rules Engine

**Centralized validation** in `src/lib/violationRules.js` - a single source of truth for all 6 Pitch Smart rules:

**Rule 1**: Pitchers must pitch consecutive innings (no gaps)
**Rule 2**: 41+ pitches → cannot catch after pitching
**Rule 3**: 4 innings catching → cannot pitch after catching 4th inning
**Rule 4**: Caught 1-3 innings + 21+ pitches → cannot return to catch
**Rule 5**: Pitch count exceeds age-based maximum
**Rule 6**: Pitched before required rest period ended (cross-game validation)

**Architecture Decision**: These functions were originally duplicated across `GameEntry.jsx` and `GameDetailModal.jsx` (~240 lines of duplication). They were refactored into shared utilities to ensure:
- Single source of truth
- Consistent validation across all components
- Easier maintenance
- Clear JSDoc documentation

**When adding new rules**: Add to `violationRules.js` and write tests in `src/__tests__/lib/violationRules.test.js`.

### Date Handling - Critical Pattern

**Problem**: Dates stored as `YYYY-MM-DD` in PostgreSQL appear one day earlier when converted to JavaScript Date objects due to UTC timezone interpretation.

**Solution**: Always use `parseLocalDate()` utility from `src/lib/pitchCountUtils.js`:

```javascript
// ❌ WRONG - Creates UTC midnight, which is previous day in local time
new Date('2025-01-15') // Shows Jan 14 in PST/EST

// ✅ CORRECT - Forces local timezone interpretation
parseLocalDate('2025-01-15') // Shows Jan 15 in all timezones
```

**Implementation**: `parseLocalDate()` appends `T00:00:00` to force local timezone.

**Used in**: All export utilities, game displays, reports, player rosters.

### User Management via Edge Function

**Problem**: Creating users requires access to `auth.users` table, which is not accessible from client-side code with anon key.

**Solution**: Supabase Edge Function `create-user` uses service role key to create both:
- `auth.users` entry (authentication)
- `user_profiles` entry (role and metadata)

**Edge Function URL**: `https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/create-user`

**When creating users**: Only super_admins can call this function, enforced by edge function auth check.

### Pitch Count Calculation

**Official Pitch Count** = Penultimate Batter Count + 1

This follows Pitch Smart guidelines. We store both:
- `final_pitch_count` - What the scorekeeper saw
- `penultimate_batter_count` - Count before final batter (official for rest calculations)

**Why penultimate?** Prevents gaming the system by walking the last batter.

**Implementation**: `getOfficialPitchCount()` in `pitchCountUtils.js`

### Smart Session Management

**Problem**: When users switch browser tabs and return, Supabase's `onAuthStateChange` fires a session validation event, causing unnecessary profile reloads and UI flashing.

**Solution**: `App.jsx` uses a ref to track user ID and only clears profile when user actually changes:

```javascript
const previousUserIdRef = useRef(null)

supabase.auth.onAuthStateChange((_event, session) => {
  const currentUserId = session?.user?.id
  const previousUserId = previousUserIdRef.current

  // Only clear if user actually changed or signed out
  if (!session || currentUserId !== previousUserId) {
    setProfile(null)
    previousUserIdRef.current = currentUserId
  }
})
```

**Benefit**: No flashing/re-rendering when switching tabs.

### Maintenance Mode

**Purpose**: Allows super_admins to put the application into maintenance mode, preventing access for all users except super_admins during critical updates or fixes.

**Architecture**:
- **Database**: `app_config` table stores `maintenance_mode` boolean and `maintenance_message` text
- **Single-row table**: Only contains one row (id=1) enforced by constraint
- **RLS Policies**: Anyone can read config (needed before auth), only super_admins can update
- **Check on startup**: `App.jsx` queries `app_config` table before authentication

**Implementation Flow**:
```javascript
// 1. Check maintenance mode on app startup (App.jsx)
const checkMaintenanceMode = async () => {
  const { data } = await supabase
    .from('app_config')
    .select('maintenance_mode, maintenance_message')
    .eq('id', 1)
    .single()

  setMaintenanceMode(data.maintenance_mode)
  setMaintenanceMessage(data.maintenance_message)
}

// 2. Show maintenance page for non-super_admins
const isSuperAdmin = profile?.role === 'super_admin'
if (maintenanceMode && !isSuperAdmin) {
  return <MaintenancePage message={maintenanceMessage} />
}
```

**Key Features**:
- **Super Admin Bypass**: Super admins can always access the app, even in maintenance mode
- **Real-time Toggle**: Changes take effect immediately for all users
- **Custom Messaging**: Configurable message displayed to users
- **Database Function**: `update_maintenance_mode()` handles updates with automatic tracking
- **Admin UI**: `/maintenance` route provides toggle and message editor

**Files Involved**:
- `database/schema.sql` - Table definition and RLS policies (section 10)
- `database/migrations/add_app_config_table.sql` - Migration file
- `src/App.jsx` - Maintenance check logic
- `src/components/common/MaintenancePage.jsx` - Maintenance display
- `src/components/admin/MaintenanceToggle.jsx` - Admin control panel
- `src/components/layout/Dashboard.jsx` - Navigation link (super_admin only)

**Manual Toggle** (Emergency use via SQL):
```sql
-- Enable maintenance mode
UPDATE public.app_config SET maintenance_mode = true WHERE id = 1;

-- Disable maintenance mode
UPDATE public.app_config SET maintenance_mode = false WHERE id = 1;
```

## Key Constraints & Business Rules

### Database Constraints
1. **Jersey Numbers**: Unique per team (database enforces via `unique_jersey_per_team`)
2. **Team Names**: Unique per division within a season (database enforces via `teams_season_id_name_division_key`) - allows "Red Sox" in Training AND Major divisions
3. **Active Season**: Only one season can be active at a time (unique partial index)
4. **Deletion Cascade Prevention**:
   - Cannot delete season if it has teams/games
   - Cannot delete team if it has players/games
   - Cannot delete player if they have game records

### User Role Rules
- **Coaches**: Always read-only, cannot edit data
- **Scorekeepers**: Not user accounts - just names stored as text in games table
- **Super Admin**: Only role that can create new users

### Data Entry Rules
- **Pitch Smart Violations**: Displayed as warnings (red badges) but do not block saves
- **Consecutive Innings**: Validated in real-time during game entry
- **Rest Day Calculations**: Stored in `next_eligible_pitch_date` on pitching_logs

## Project Structure Patterns

### Component Organization

```
src/components/
├── admin/         # User management (super_admin only)
├── auth/          # Login, password change
├── coaches/       # Coach viewing and assignments
├── common/        # Shared components (modals, confirmations)
├── games/         # Game entry and viewing
├── layout/        # Dashboard, navigation, footer
├── players/       # Player management, bulk import
├── reports/       # Game lists, absence reports
├── routing/       # Route protection and redirects
├── rules/         # Rules documentation display
├── seasons/       # Season CRUD
├── teams/         # Team management, coach assignments
└── tools/         # Admin-only export tools
```

### Library (Utilities) Organization

```
src/lib/
├── supabase.js           # Supabase client initialization
├── violationRules.js     # 6 validation rules (centralized)
├── pitchSmartRules.js    # Pitch Smart guidelines data
├── pitchCountUtils.js    # Date parsing, pitch count formatting
├── exportUtils.js        # JSON/CSV/HTML export generators
└── useCoachAssignments.js # React hook for coach assignments
```

### Modal Pattern

Most management components follow this pattern:
1. **List View** - Table showing all records
2. **Modal Form** - Add/edit modal (separate component)
3. **Confirmation Modal** - Delete confirmation (reusable component)

Example: `PlayerManagement.jsx` uses `PlayerModal.jsx` and `PlayerDeleteConfirmationModal.jsx`

### Two-Step Game Entry Pattern

`GameEntry.jsx` uses a two-step wizard:

**Step 1**: Game metadata (date, teams, scores, scorekeeper)
**Step 2**: Player data entry (attendance, innings pitched/caught, pitch counts)

**Why two steps?** Step 1 creates the game record in database, Step 2 adds player data to existing game. Prevents data loss if user navigates away.

## Testing Approach

### Framework: Vitest (Not Jest)

**Why Vitest?**
- Native Vite integration (shares `vite.config.js`)
- 5-10x faster than Jest (0.5-2s startup vs 3-8s)
- Native ES module support (no experimental flags)
- Jest-compatible API

### Test Infrastructure

**Global Setup**: `src/__tests__/setup.js`
- Mocks Supabase client globally (no real DB calls)
- Provides jsdom for browser API simulation
- Clears all mocks before each test

**Test Location**: Mirror source structure in `__tests__/` directory
- `src/lib/violationRules.js` → `src/__tests__/lib/violationRules.test.js`

### Current Coverage

✅ **violationRules.js** - 37 tests, 95%+ coverage (all 6 rules tested)
🚧 **Other utilities** - Planned in testing roadmap

### Writing New Tests

```javascript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../lib/myUtil'

describe('myFunction', () => {
  it('should handle normal case', () => {
    expect(myFunction(input)).toBe(expectedOutput)
  })

  it('should handle edge case', () => {
    expect(myFunction(edgeInput)).toBe(expectedEdgeOutput)
  })
})
```

**Best Practices**:
- Test behavior, not implementation
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Test edge cases (empty arrays, null values, boundary conditions)

## Common Gotchas & Solutions

### Issue: Tailwind PostCSS Error
**Cause**: Tailwind v4 has breaking changes
**Solution**: Must use Tailwind v3.4.1
```bash
npm install tailwindcss@3.4.1 -D
```

### Issue: RLS Infinite Recursion
**Cause**: RLS policy queries `user_profiles` table which also has RLS
**Solution**: Use helper functions (`is_admin()`, `is_super_admin()`) that call `private.get_user_info()`

### Issue: Dates Off by One Day
**Cause**: `new Date('2025-01-15')` creates UTC midnight
**Solution**: Use `parseLocalDate()` from `pitchCountUtils.js`

### Issue: Duplicate Jersey Numbers
**Cause**: User tries to add player with existing jersey number on same team
**Solution**: Database constraint `unique_jersey_per_team` prevents this - catch error in UI

### Issue: Cannot Create Users from UI
**Cause**: Client-side anon key cannot access `auth.users` table
**Solution**: Use edge function `create-user` (already deployed)

### Issue: Coach Cannot See Other Teams' Coaches
**Cause**: Old RLS policy was too restrictive
**Solution**: Updated `team_coaches` SELECT policy to allow all authenticated users to view

## Development Workflow

### Incremental Development Pattern
1. Build one feature at a time
2. Test immediately after implementation
3. Write tests for business logic
4. Make small, focused commits
5. Create PR with summary of changes

### File Modification Workflow
1. Read existing file first (never modify without reading)
2. Make targeted changes (avoid over-engineering)
3. Test locally with `npm run dev` and `npm run test`
4. Verify no regressions

### Commit Message Style
Review recent commits for style (use `git log --oneline -10`):
- Concise (1-2 sentences)
- Focus on "why" rather than "what"
- Include "Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>" when using Claude

## Important Warnings

### Security
- Never commit `.env.local` (contains Supabase keys)
- Never use service role key in client-side code
- Always use RLS policies for authorization, not just client-side checks

### Data Integrity
- Never bypass validation rules without explicit user request
- Always use transactions for multi-table operations
- Test deletion cascades carefully (prevent orphaned data)

### Performance
- Limit Supabase queries (use select filters, avoid N+1 queries)
- Use indexes on frequently queried columns
- Consider pagination for large lists (not implemented yet)

## Quick Reference

### Supabase Client Usage
```javascript
import { supabase } from '../lib/supabase'

// Query with RLS applied automatically
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('team_id', teamId)
  .order('jersey_number')
```

### React Router Navigation
```javascript
import { useNavigate } from 'react-router-dom'

function MyComponent() {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate('/teams')
  }
}
```

### Get Current User Profile
```javascript
// In any component (context provided by App.jsx)
const { profile } = useContext(ProfileContext)

// profile.role = 'super_admin' | 'admin' | 'coach'
// profile.id = user UUID
// profile.email, profile.name, etc.
```

## Related Documentation

- **README.md** - Comprehensive project overview, feature list, setup guide
- **TESTING.md** - Detailed testing documentation (Vitest, best practices)
- **RULES.md** - Complete baseball rules documentation (6 validation rules)
- **database/schema.sql** - Full database schema with RLS policies
- **database/PERFORMANCE_DECISIONS.md** - Database performance optimization decisions (indexes, trade-offs)

## Code Changes

When making changes across the codebase (e.g., updating age ranges, validation rules, constants), always search ALL files including modals, tests, documentation, database constraints, and translations. Never assume the initial search found everything — do a final verification grep before reporting completion.

## Testing

When tests fail, first determine whether the bug is in the implementation code or the test code before attempting fixes. Ask yourself: 'Does the test reflect the correct business logic?' If yes, fix the implementation. If no, fix the test. Never blindly adjust tests to match broken code.

## Project Stack & Deployment

This project uses Next.js deployed on Vercel with Turso (SQLite), Prisma, NextAuth/AuthJS, Resend for emails, and Supabase for some features. When debugging deployment issues, check: 1) Edge function size limits 2) Environment variable formatting (trailing whitespace/carriage returns) 3) Prisma postinstall hooks 4) AUTH_SECRET requirements differ between dev and prod.

## Workflow Conventions

Always update project documentation (ARCHITECTURE.md, relevant markdown docs, CHANGELOG) after completing feature implementations or bug fixes. Do not wait to be asked — include doc updates as part of the task.

## Languages

Primary languages: JavaScript/JSX (React components), TypeScript. Use JavaScript for the Next.js web app unless the file is already TypeScript.
