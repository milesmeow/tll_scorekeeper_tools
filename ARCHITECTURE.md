# System Architecture - Baseball Team Management App

**Last Updated**: January 2026
**Status**: Phase 4 In Progress (Testing Infrastructure Complete)

---

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────┐
│                   USER'S BROWSER                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         React App (Vite Dev Server)              │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │  Component Tree                          │   │  │
│  │  │  ├─ App.jsx (Auth State)                │   │  │
│  │  │  └─ Dashboard.jsx                        │   │  │
│  │  │       ├─ SeasonManagement                │   │  │
│  │  │       ├─ TeamManagement                  │   │  │
│  │  │       ├─ PlayerManagement                │   │  │
│  │  │       ├─ CoachManagement                 │   │  │
│  │  │       ├─ GameEntry                       │   │  │
│  │  │       └─ UserManagement                  │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                     ↕                            │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │  @supabase/supabase-js Client            │   │  │
│  │  │  (Auth + Database Queries)               │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│              SUPABASE CLOUD (PostgreSQL)                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authentication Service (Supabase Auth)          │  │
│  │  ├─ User sign in/out (JWT tokens)              │  │
│  │  ├─ Session management                          │  │
│  │  └─ Password updates                            │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↕                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (10 tables)                 │  │
│  │  ├─ user_profiles, seasons, teams, players       │  │
│  │  ├─ games, game_players, team_coaches            │  │
│  │  ├─ pitching_logs, positions_played              │  │
│  │  └─ app_config (maintenance mode)                │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↕                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Row Level Security (RLS) Policies               │  │
│  │  ├─ Helper Functions: is_admin(), is_super_admin │  │
│  │  ├─ Super admins: full access                    │  │
│  │  ├─ Admins: read/write all data                  │  │
│  │  └─ Coaches: read-only teams, players & games    │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↕                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno Runtime)                   │  │
│  │  ├─ create-user (service role key)               │  │
│  │  └─ reset-password (service role key)                          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
User enters credentials
         ↓
Login.jsx component
         ↓
supabase.auth.signInWithPassword()
         ↓
Supabase Auth validates → Returns JWT token
         ↓
Query user_profiles table (no RLS blocking)
         ↓
Check must_change_password flag
         ↓
  ┌─────┴─────┐
  │           │
 YES         NO
  │           │
  ↓           ↓
ChangePassword  Dashboard
Component      Component
         ↓
App.jsx manages session state
```

---

## User Creation Flow (Edge Function)

```
Super Admin clicks "Add User" in UserManagement
         ↓
AddUserModal form filled out
         ↓
Fetch call to Edge Function with Bearer token
         ↓
┌────────────────────────────────────────┐
│  Edge Function: create-user            │
│  1. Validate caller is super_admin     │
│  2. Use service role key to:           │
│     a. Create auth.users entry         │
│     b. Create user_profiles entry      │
│  3. Return success or rollback         │
└────────────────────────────────────────┘
         ↓
Success → Refresh user list
         ↓
Show alert with temp password
```

**Why Edge Function?**

- Client (anon key) can't create auth users
- Service role key must stay server-side
- Function validates caller is super_admin
- Atomic operation (both tables or neither)

---

## Data Entry Flow - Game Entry (Multi-Step)

```
User clicks "Enter New Game"
         ↓
GameFormModal - Step 1: Basic Info
  - Date, teams, scores
  - Scorekeeper name and team
         ↓
Submit Step 1 → Save to games table
         ↓
Fetch players for both teams
         ↓
GameFormModal - Step 2: Player Data
  - For each player (home & away):
    • Attendance checkbox
    • Absence note (if absent)
    • Innings pitched checkboxes (1-7)
    • Innings caught checkboxes (1-7)
    • Pitch count (if pitched)
         ↓
Submit Step 2 → Save to 4 tables:
┌────────────────────────────────────────┐
│  Transaction (all or nothing):         │
│  1. game_players (attendance)          │
│  2. pitching_logs (if pitched)         │
│  3. positions_played (pitcher)         │
│  4. positions_played (catcher)         │
└────────────────────────────────────────┘
         ↓
Success → Return to games list
```

---

## Database Relationships

```
                    seasons
                       ↓ (1:N)
                    teams ←──────────┐
                    ↓   ↓            │
            (1:N) ↓     ↓ (N:M)      │
                players team_coaches │
                  ↓                  │
          (N:M) ↓                    │
            games ←───────────────────┘
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
game_players  pitching  positions
(attendance)  _logs     _played
```

**Key Relationships**:

- Season → Teams (1:N)
- Team → Players (1:N)
- Team → Coaches (N:M via team_coaches)
- Games ↔ Teams (N:M - home & away)
- Game → Player Data (1:N for each type)

**Foreign Key Constraints** (Mixed Strategy):

- **RESTRICT** on core entities: Prevents deleting seasons/teams/players that have dependent records
  - `teams` → `seasons`: Can't delete season with teams
  - `players` → `teams`: Can't delete team with players
  - `games` → `seasons`, `teams`: Can't delete season/team with games
- **CASCADE** on child records: Auto-removes granular data when parent deleted
  - `team_coaches`, `game_players`, `pitching_logs`, `positions_played`
- This protects important data while allowing cleanup of derived records

---

## Security Architecture

### Row Level Security (RLS) Implementation

**Problem Solved**: Original RLS policies caused infinite recursion when checking user_profiles from within user_profiles policies.

**Solution**: Two-part approach

#### Part 1: Helper Functions

```sql
-- Security Definer functions query user_profiles
CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

#### Part 2: Policies Use Functions

```sql
-- Example: Seasons table
CREATE POLICY "Admins can manage seasons"
  ON seasons FOR ALL
  USING (is_admin());  -- No recursion!

-- Example: Teams table
CREATE POLICY "Coaches can view assigned teams"
  ON teams FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM team_coaches tc
      WHERE tc.team_id = teams.id
      AND tc.user_id = auth.uid()
    )
  );
```

### Why user_profiles Has NO RLS

**Risks Without RLS**:

- ❌ Anyone can see all users? NO - still requires authentication
- ❌ Anyone can modify? NO - app logic controls this
- ❌ Exposed data? NO - only accessible to logged-in users

**Benefits**:

- ✅ Avoids infinite recursion
- ✅ Helper functions can query it
- ✅ Simpler policy design
- ✅ Still protected by auth.uid() requirement

**Protection Layers**:

1. Supabase Auth (must have valid JWT)
2. Application logic (UI only shows allowed actions)
3. Helper functions check roles before granting access

---

## Component Architecture

### State Management Pattern

```javascript
// Typical component structure
export default function FeatureManagement() {
  // Data state
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  // Feedback state
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Data fetching
  useEffect(() => {
    fetchItems()
  }, [dependencies])

  // CRUD operations
  const handleCreate = async () => { ... }
  const handleUpdate = async () => { ... }
  const handleDelete = async () => { ... }

  return (
    // JSX with conditional rendering
  )
}
```

### Modal Pattern

```javascript
// Modals are inline components (not separate files)
function ItemModal({ item, onClose, onSuccess, onError }) {
  // Local state for form
  const [formData, setFormData] = useState({ ... })
  const [modalError, setModalError] = useState(null)

  // Handles both create and edit modes
  const isEditing = !!item

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 ...">
      {/* Modal with error display inside */}
    </div>
  )
}
```

**Why inline?**

- Related code stays together
- Easy to share parent state
- Fewer files to manage
- Clear component ownership

### Role-Based Season Filtering Pattern

Multiple components (GameEntry, TeamManagement, CoachManagement) use this consistent pattern for season filtering based on user role:

```javascript
// State setup
const [seasons, setSeasons] = useState([])
const [selectedSeason, setSelectedSeason] = useState(null)

// Fetch seasons with role-based filtering
const fetchSeasons = async () => {
  let query = supabase.from('seasons').select('*')

  // Coaches only see active season
  if (!isAdmin) {
    query = query.eq('is_active', true)
  }

  query = query
    .order('is_active', { ascending: false })
    .order('start_date', { ascending: false })

  const { data } = await query

  // Auto-select active season as default
  const activeSeason = data.find(s => s.is_active)
  if (activeSeason) {
    setSelectedSeason(activeSeason.id)
  } else if (data.length > 0) {
    setSelectedSeason(data[0].id)
  }
}
```

**UI Pattern:**
```jsx
<select
  value={selectedSeason || ''}
  onChange={(e) => setSelectedSeason(e.target.value)}
  disabled={!isAdmin}  // Coaches can't change season
>
  {seasons.map((season) => (
    <option key={season.id} value={season.id}>
      {season.name} {season.is_active ? '(Active)' : ''}
    </option>
  ))}
</select>
```

**Key Points:**
- Admins see all seasons in dropdown
- Coaches see only active season (dropdown disabled)
- Active season auto-selected as default for all users
- Data queries filter by `selectedSeason` to scope results

---

## Data Flow Examples

### Example 1: Adding a Player (Individual)

```
PlayerManagement renders
         ↓
User clicks "Add Player"
         ↓
showAddModal = true
         ↓
PlayerModal renders
         ↓
User fills form
         ↓
Submit → Validation
         ↓
supabase.from('players').insert()
         ↓
Check for errors (e.g., duplicate jersey)
         ↓
  ┌─────┴─────┐
  │           │
ERROR      SUCCESS
  │           │
  ↓           ↓
Show in    Close modal
modal      fetchPlayers()
           setSuccess()
```

### Example 2: Bulk CSV Import

```
User clicks "Bulk Add (CSV)"
         ↓
BulkAddModal renders
         ↓
User pastes CSV:
  John, 12, 5
  Jane, 11, 7
         ↓
Parse CSV line by line
  - Split on comma
  - Validate age (6-12)
  - Validate format
         ↓
Build array of player objects
         ↓
supabase.from('players').insert(array)
         ↓
  ┌─────┴─────┐
  │           │
ERROR      SUCCESS
(duplicate  (n players
 jersey)     added)
```

### Example 3: Two-Step Game Entry

```
Step 1: Basic Info
  ↓
Save game → Get game.id
  ↓
Fetch players for both teams
  ↓
Initialize player state arrays
  ↓
Step 2: Player Data
  ↓
User marks attendance, positions, pitch counts
  ↓
Submit → Build insert arrays
  ↓
Insert to 4 tables in sequence:
  1. game_players (attendance)
  2. pitching_logs (where innings_pitched.length > 0)
  3. positions_played (pitcher positions)
  4. positions_played (catcher positions)
  ↓
Any error → Show in modal
All success → Close and refresh
```

---

## UI/UX Patterns

### Navigation Pattern

```
Dashboard (always visible)
  └─ Sidebar navigation (state-based routing)
       ├─ Home
       ├─ User Management (super_admin only)
       ├─ Seasons
       ├─ Teams
       ├─ Players
       ├─ Coaches
       ├─ Games
       └─ Reports (coming soon)
```

**Why state-based routing?**

- Simple to implement
- No React Router complexity needed yet
- Easy to control visibility by role
- Fast switching (no page reload)

### Feedback Pattern

```javascript
// Success messages
setSuccess("Operation completed!");
setTimeout(() => setSuccess(null), 3000); // Auto-dismiss

// Error messages
setError(error.message); // Stay until dismissed or new action

// Modal errors
setModalError(error.message); // Show inside modal (not behind it)
```

### Form Validation Pattern

```javascript
// Database-level validation
- Jersey number unique per team → Constraint violation error
- Age 6-12 → CHECK constraint
- Required fields → NOT NULL constraints

// Application-level validation
- Home team ≠ Away team → Before insert
- Jersey number format → Before insert
- CSV parsing → Before bulk insert

// UI feedback
- Required fields: HTML5 required attribute
- Error messages: Specific to validation that failed
```

---

## Database Constraints & Business Rules

### Enforced at Database Level

```sql
-- Only one active season
CREATE UNIQUE INDEX idx_only_one_active_season
  ON seasons(is_active)
  WHERE is_active = true;

-- Unique jersey per team
ALTER TABLE players
  ADD CONSTRAINT unique_jersey_per_team
  UNIQUE (team_id, jersey_number);

-- Age range validation
ALTER TABLE players
  ADD CONSTRAINT players_age_check
  CHECK (age >= 6 AND age <= 12);

-- Pitch count relationship
ALTER TABLE pitching_logs
  ADD CONSTRAINT pitch_count_relationship
  CHECK (penultimate_batter_count <= final_pitch_count);

-- Home ≠ Away teams
ALTER TABLE games
  ADD CONSTRAINT different_teams
  CHECK (home_team_id != away_team_id);
```

### Enforced at Application Level

```javascript
// Examples of app-level validations
- Only super_admins can create users (Edge Function)
- Coaches always get can_edit=false (hardcoded)
- Final pitch count required if innings_pitched > 0
- CSV format validation before batch insert
```

### To Be Enforced (Phase 4)

```javascript
// Rules engine (coming soon)
- Rest days based on pitch count + age
- Can't pitch if caught 4+ innings in same game
- Max pitch count per age group
- Warning flags for violations
```

---

## Performance Considerations

### Optimizations Implemented

1. **Database Indexes**

   ```sql
   -- Season lookups
   CREATE INDEX idx_seasons_active ON seasons(is_active);

   -- Team lookups
   CREATE INDEX idx_teams_season ON teams(season_id);

   -- Player lookups
   CREATE INDEX idx_players_team ON players(team_id);
   CREATE INDEX idx_players_age ON players(age);

   -- Game lookups
   CREATE INDEX idx_games_season ON games(season_id);
   CREATE INDEX idx_games_date ON games(game_date);
   ```

2. **Query Patterns**
   - Fetch with joins for related data
   - Order by at database level
   - Limit results when appropriate

3. **State Updates**
   - Fetch fresh data after mutations
   - Auto-dismiss success messages (reduce DOM)
   - Conditional rendering (don't render hidden modals)

### Scalability

**Current Capacity** (Free Tiers):

- Supabase: 500MB database, 50K monthly active users
- Vercel: 100GB bandwidth/month

**Realistic Load** (Per Season):

- 50 user accounts
- 20 teams
- 300 players
- 200 games
- 2000 player-game records

**Database Size Estimate**:

- ~5MB per season of data
- Can handle 100+ seasons on free tier

---

## Error Handling Strategy

### Levels of Error Handling

1. **Database Level**

   ```sql
   -- Constraints return specific error codes
   23505 → Unique violation (duplicate)
   23503 → Foreign key violation (can't delete)
   23514 → Check constraint violation (invalid data)
   ```

2. **API Level**

   ```javascript
   // Supabase client catches errors
   const { data, error } = await supabase...
   if (error) {
     // Map to user-friendly messages
     if (error.code === '23505') {
       throw new Error('Jersey number already exists')
     }
   }
   ```

3. **UI Level**
   ```javascript
   // Component try-catch
   try {
     await operation();
     setSuccess("Done!");
   } catch (err) {
     setError(err.message); // Or setModalError for modals
   }
   ```

### User-Facing Error Messages

```javascript
// Examples of good error messages
❌ Bad: "23505: duplicate key value violates unique constraint"
✅ Good: "Jersey number already exists on this team"

❌ Bad: "23503: update or delete violates foreign key constraint"
✅ Good: "Cannot delete team: players are still assigned to it"

❌ Bad: "ERROR: 0A000: cannot use subquery in check constraint"
✅ Good: (Fix in schema, user never sees this)
```

---

## Development Workflow

### Adding a New Feature

1. **Database First** (if schema changes needed)

   ```sql
   -- Add table/column in Supabase SQL Editor
   -- Add constraints, indexes
   -- Update RLS policies if needed
   ```

2. **Component Structure**

   ```javascript
   // Create new component file
   // Add to Dashboard imports
   // Add navigation menu item
   // Wire up in Dashboard JSX
   ```

3. **Incremental Development**

   ```
   - Build basic structure first
   - Add one operation (e.g., Create)
   - Test thoroughly
   - Add next operation (e.g., Edit)
   - Continue until feature complete
   ```

4. **Testing Pattern**
   ```
   - Test happy path
   - Test validation errors
   - Test edge cases (empty lists, duplicates)
   - Test deletion constraints
   ```

### Git Commit Pattern

```bash
# Specific, incremental commits
git add src/components/seasons/SeasonManagement.jsx
git commit -m "Add season creation with end_date optional"

git add database/schema.sql
git commit -m "Add unique constraint for active seasons"

git add src/components/teams/TeamManagement.jsx
git commit -m "Add coach assignment to team management"
```

---

## Technology Decisions & Rationale

### Why Supabase?

- ✅ PostgreSQL (industry standard)
- ✅ Built-in authentication
- ✅ Row Level Security (data isolation)
- ✅ Real-time capabilities (future use)
- ✅ Generous free tier
- ✅ Auto-generated API

### Why Vite?

- ✅ Fast dev server (hot reload)
- ✅ Modern build tool
- ✅ Better DX than Create React App
- ✅ Smaller bundle sizes

### Why Tailwind CSS v3?

- ✅ Utility-first (rapid development)
- ✅ Consistent design system
- ✅ v4 has PostCSS issues (locked to v3.4.1)

### Why NOT Next.js?

- ❌ Overkill for this use case
- ❌ Server components not needed
- ❌ Supabase handles backend
- ✅ Vite is simpler, faster for SPA

### Why Edge Functions?

- ✅ Secure user creation (service role key)
- ✅ Server-side logic when needed
- ✅ Scales automatically
- ✅ Free tier sufficient

### Why Vitest?

- ✅ Native Vite integration (same config, same transforms)
- ✅ 10x faster than Jest (0.5-2s startup vs 3-8s)
- ✅ Native ES module support (no experimental flags)
- ✅ Jest-compatible API (easy migration/familiar syntax)
- ✅ Built-in coverage and UI dashboard
- ✅ Perfect match for our Vite+React stack

---

## Testing Architecture

### Testing Framework: Vitest + React Testing Library

**Philosophy**: Test behavior, not implementation. Focus on user-visible outcomes.

```
┌─────────────────────────────────────────────────────────┐
│                  TESTING LAYERS                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Unit Tests (Priority 1)                         │  │
│  │  - Business logic (violationRules.js)            │  │
│  │  - Utility functions (date, pitch calculations)  │  │
│  │  - Pure functions (no side effects)              │  │
│  │  Coverage: 90%+ on critical logic                │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Component Tests (Priority 2)                    │  │
│  │  - User interactions (clicks, form submissions)  │  │
│  │  - Conditional rendering (role-based UI)         │  │
│  │  - Data fetching and state updates               │  │
│  │  Coverage: 70%+ on components                    │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Integration Tests (Priority 3)                  │  │
│  │  - Multi-step workflows (game entry)             │  │
│  │  - Authentication flows                          │  │
│  │  - CRUD operations with validation               │  │
│  │  Coverage: 50%+ on critical paths                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Test Execution Flow

```
Developer runs: npm run test
         ↓
Vitest starts (reads vite.config.js)
         ↓
Loads src/__tests__/setup.js
  - Mocks Supabase client globally
  - Mocks browser APIs (matchMedia, alert, confirm)
  - Configures jsdom environment
         ↓
For each test file:
  1. Uses Vite to transform (same as dev server)
     - JSX → JavaScript
     - ES imports → Resolved modules
  2. Runs in Node.js with jsdom (fake browser)
  3. Resets all mocks (beforeEach hook)
  4. Executes test assertions
         ↓
Reports results (pass/fail)
         ↓
Watch for file changes → Rerun affected tests
```

### Mocking Strategy

**Supabase Client Mock** (`src/__tests__/setup.js`):

```javascript
vi.mock("../lib/supabase.js", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));
```

**Why this works:**

- Tests never hit real Supabase database
- All database operations are mocked
- Return values controlled in individual tests
- Fast execution (no network calls)

**Browser API Mocks**:

```javascript
// window.matchMedia (used by some UI components)
global.matchMedia = vi.fn(...)

// window.alert (used in error displays)
global.alert = vi.fn()

// window.confirm (used in delete confirmations)
global.confirm = vi.fn(() => true)
```

### Test Coverage (Current)

| Module               | Tests | Coverage | Priority    |
| -------------------- | ----- | -------- | ----------- |
| `violationRules.js`  | 30    | 95%+     | ✅ Critical |
| `pitchSmartRules.js` | 0     | 0%       | 🔴 High     |
| `pitchCountUtils.js` | 0     | 0%       | 🔴 High     |
| `exportUtils.js`     | 0     | 0%       | 🟡 Medium   |
| Components           | 0     | 0%       | 🟡 Medium   |

**Target Coverage Goals:**

- Business logic (lib/): 90%+
- Components: 70%+
- Overall: 65%+

### Vitest Configuration

**vite.config.js**:

```javascript
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },

  test: {
    globals: true, // No need to import describe/it/expect
    environment: "jsdom", // Browser simulation
    setupFiles: "./src/__tests__/setup.js", // Global mocks
    coverage: {
      provider: "v8", // Built-in V8 coverage (fast)
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/__tests__/", "database/", "dist/"],
    },
  },
});
```

**Key Benefits:**

- Same file for dev server AND tests
- No duplicate configs (no jest.config.js or Babel setup)
- Vite's transform pipeline used for both

### Test Scripts (package.json)

```json
{
  "scripts": {
    "test": "vitest", // Watch mode (dev)
    "test:run": "vitest run", // Run once (CI)
    "test:ui": "vitest --ui", // Visual dashboard
    "test:coverage": "vitest --coverage" // Coverage report
  }
}
```

### Performance Characteristics

| Operation               | Vitest    | Jest (for comparison) |
| ----------------------- | --------- | --------------------- |
| **Cold start**          | 0.5-2s    | 3-8s                  |
| **Watch mode rerun**    | 100-500ms | 1-3s                  |
| **30 tests execution**  | 9ms       | ~50-100ms             |
| **Coverage generation** | 1-2s      | 3-5s                  |

**Why Vitest is faster:**

1. Reuses Vite's transformation cache
2. Native ES modules (no transpilation overhead)
3. Multi-threaded by default
4. Smart dependency tracking

### Testing Best Practices (Enforced)

1. **Arrange-Act-Assert Pattern**

   ```javascript
   it("should calculate rest days", () => {
     // Arrange
     const age = 10,
       pitches = 55;

     // Act
     const result = calculateRestDays(age, pitches);

     // Assert
     expect(result).toBe(3);
   });
   ```

2. **Descriptive Test Names**
   - ❌ Bad: `it('works', ...)`
   - ✅ Good: `it('should return false when pitch count is below 41', ...)`

3. **Test Edge Cases**
   - Null/undefined inputs
   - Empty arrays
   - Boundary values (0, 1, max)
   - Invalid data

4. **Isolated Tests**
   - No shared state between tests
   - Mocks reset before each test
   - No dependency on test execution order

---

## File Structure Explained

```
baseball-app/
├── database/
│   └── schema.sql              # Single source of truth for DB
│
├── src/
│   ├── __tests__/              # Test files (mirrors src/ structure)
│   │   ├── setup.js            # Global test setup & mocks
│   │   ├── lib/
│   │   │   └── violationRules.test.js  # 30 tests (95%+ coverage)
│   │   └── components/         # (future component tests)
│   │
│   ├── components/
│   │   ├── auth/               # Login, password change
│   │   ├── admin/              # User management
│   │   ├── layout/             # Dashboard, navigation
│   │   ├── seasons/            # Season CRUD
│   │   ├── teams/              # Team CRUD + coach assign
│   │   ├── players/            # Player CRUD + CSV import
│   │   ├── coaches/            # Coach list view
│   │   └── games/              # Game entry (2-step form)
│   │
│   ├── lib/
│   │   ├── supabase.js         # Client config (uses .env)
│   │   ├── violationRules.js   # Pitch Smart validation (TESTED)
│   │   ├── pitchSmartRules.js  # Age-based rules
│   │   ├── pitchCountUtils.js  # Date/pitch utilities
│   │   └── exportUtils.js      # Export functions
│   │
│   ├── App.jsx                 # Auth state + routing
│   ├── main.jsx                # ReactDOM render
│   └── index.css               # Tailwind + custom styles
│
├── .env.local                  # Supabase credentials (gitignored)
├── .gitignore                  # Standard + .env files
├── package.json                # Dependencies + test scripts
├── vite.config.js              # Vite + Vitest config
├── tailwind.config.js          # Tailwind v3 config
└── postcss.config.js           # PostCSS settings
```

---

## Deployment Architecture (Future)

```
┌──────────────────┐
│   Developer      │
│   (Local)        │
└────────┬─────────┘
         │ git push
         ↓
┌──────────────────┐
│   GitHub         │
│   Repository     │
└────────┬─────────┘
         │ webhook
         ↓
┌──────────────────┐
│   Vercel         │ ← Auto-deploy from main branch
│   (React build)  │
└────────┬─────────┘
         │ API calls
         ↓
┌──────────────────┐
│   Supabase       │ ← PostgreSQL + Auth + Edge Functions
│   (Backend)      │
└──────────────────┘
```

**Production Checklist** (When Ready):

- [ ] Environment variables in Vercel
- [ ] Update Supabase auth URLs (redirect, site URL)
- [ ] Enable 2FA for admin accounts
- [ ] Review RLS policies for production
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure custom domain

---

**Architecture Version**: 2.2 (Updated January 2026)
**Major Updates**:

- Added comprehensive Testing Architecture section
- Documented Vitest integration and rationale
- Updated file structure to include `__tests__/` directory
- Added testing best practices and coverage goals
- Added Role-Based Season Filtering Pattern documentation
  - Consistent pattern used across GameEntry, TeamManagement, CoachManagement
  - Documents role-based query filtering and UI disabled states

**Next Review**: After additional test coverage expansion
