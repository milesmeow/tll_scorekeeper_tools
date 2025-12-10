# Baseball Team Management App - Project Summary

**Last Updated**: December 2024  
**Current Status**: Phase 2 Complete, Phase 3 In Progress

---

## Executive Summary

A zero-cost baseball team management application focused on Pitch Smart compliance tracking. Built for ~50 users per season managing multiple teams across Training, Minor, and Major divisions. Tracks pitch counts, player attendance, and enforces age-based rest day requirements.

---

## What We've Built

### Phase 1: Foundation ✅ (COMPLETE)

**Authentication & User Management**
- Supabase-based authentication with session management
- Forced password change on first login
- Super admins can create users via Edge Function (not manual Supabase dashboard anymore!)
- Three user roles: Super Admin, Admin, Coach

**Database Infrastructure**
- 10-table PostgreSQL schema with relationships
- Row Level Security (RLS) with helper functions (avoids recursion)
- Pitch Smart guidelines embedded as reference data
- All constraints properly enforced at database level

**Key Achievement**: Resolved all RLS infinite recursion issues by disabling RLS on user_profiles and using helper functions (`is_admin()`, `is_super_admin()`) for policy checks.

---

### Phase 2: Data Management ✅ (COMPLETE)

**Season Management**
- Create, edit, delete seasons
- Set one active season (enforced by unique partial index)
- End date is optional (NULL allowed)
- Cannot delete if teams/games exist

**Team Management**
- Create teams within seasons
- Organize by division: Training, Minor, Major
- Edit team name/division
- Delete with foreign key protection
- Assign coaches to teams

**Player Management**
- Add players individually with name, age, jersey number
- **Bulk CSV import** - paste CSV data to add multiple players at once
  - Format: `Name, Age, Jersey# (optional)`
- Edit and delete players
- Jersey numbers enforced unique per team (database constraint)
- Age range: 7-22

**Coach Management**
- View all coaches (users with role=coach or admin)
- See their team assignments and permissions
- Coaches are **always read-only** (can_edit always false)

**Coach Assignments**
- Assign coaches to teams from Team Management page
- Set role: head_coach or assistant
- Permissions are always read-only (design change from original)
- Remove coach assignments

**Key Design Change**: Scorekeepers are NOT user accounts. They're just names entered as text when recording game data. Only Super Admin, Admin, and Coach are login roles.

---

### Phase 3: Game Entry 🚧 (IN PROGRESS)

**Completed**:
- Two-step game entry form:
  - **Step 1**: Basic info (date, teams, scores, scorekeeper name + team)
  - **Step 2**: Player data for both teams
- Player data entry per team:
  - Attendance tracking (present/absent with notes)
  - Innings pitched (checkboxes 1-7)
  - Innings caught (checkboxes 1-7)
  - Pitch count before last batter (optional)
  - Final pitch count (required if pitched)
- Saves to 4 tables: games, game_players, pitching_logs, positions_played

**Still To Build**:
- View entered games with full details
- Edit/update game data
- Delete games
- Real-time rule validation during entry
- Warnings for rule violations

---

## Critical Design Changes from Original Plan

### 1. User Roles Simplified
**Original**: Super Admin, Admin, Coach, Scorekeeper  
**Current**: Super Admin, Admin, Coach only  
**Reason**: Scorekeepers don't need login access, just text field for name

### 2. Coach Permissions Locked
**Original**: Coaches could have edit permissions  
**Current**: Coaches are always read-only  
**Reason**: Admins control all data entry

### 3. RLS Policy Approach Changed
**Original**: Direct subqueries in policies  
**Current**: Helper functions + no RLS on user_profiles  
**Reason**: Avoid infinite recursion errors

### 4. Season End Date Made Optional
**Original**: Required field  
**Current**: NULL allowed  
**Reason**: Ongoing seasons don't have end dates yet

### 5. Active Season Constraint Method
**Original**: CHECK constraint with subquery  
**Current**: Unique partial index on is_active WHERE is_active=true  
**Reason**: PostgreSQL doesn't allow subqueries in CHECK constraints

### 6. User Creation Method
**Original**: Manual in Supabase dashboard  
**Current**: Edge Function called from app  
**Reason**: Better UX for super admins

### 7. Jersey Number Uniqueness
**Original**: Not enforced  
**Current**: Database constraint (team_id, jersey_number) UNIQUE  
**Reason**: Prevent duplicate jersey numbers on same team

### 8. Scorekeeper Team Tracking
**Original**: Not planned  
**Current**: games.scorekeeper_team_id field added  
**Reason**: Need to know which team the scorekeeper belongs to

---

## Technical Architecture

### Frontend Stack
- **React 18.2.0** - UI framework
- **Vite 7.x** - Build tool & dev server
- **Tailwind CSS 3.4.1** - Styling (v4 causes PostCSS errors!)
- **React Router 7.x** - Client-side routing (not actively used yet)
- **Supabase Client 2.x** - API communication

### Backend Stack
- **Supabase PostgreSQL** - Database
- **Supabase Auth** - User authentication
- **Row Level Security** - Data access control
- **Edge Functions (Deno)** - Serverless functions

### Security Model

```
Request Flow:
User Login → Supabase Auth validates → JWT token issued
              ↓
Request to database → RLS checks helper function → is_admin() queries user_profiles
              ↓
Policy evaluates → Grant/Deny access based on role
```

**Helper Functions**:
```sql
public.is_admin() -- Returns boolean, checks if user is super_admin OR admin
public.is_super_admin() -- Returns boolean, checks if user is super_admin
```

**Why user_profiles has NO RLS**:
- Avoids infinite recursion (policies need to check user_profiles)
- Still protected by Supabase authentication (must be logged in)
- Safe because all access goes through authenticated requests

### Edge Function: create-user

**Endpoint**: `https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/create-user`

**Purpose**: Securely create users from the app (uses service role key)

**Flow**:
1. Super admin calls function with Bearer token
2. Function validates caller is super_admin
3. Creates auth.users entry with Supabase Admin API
4. Creates user_profiles entry
5. Returns success (or rolls back on error)

**Security**: Service role key never exposed to client, only in server-side function

---

## Database Schema Highlights

### Tables with Special Considerations

**seasons**
- Unique partial index ensures only one is_active=true
- end_date allows NULL
- Cannot delete if has teams/games (FK constraint)

**teams**  
- Unique constraint on (season_id, name)
- Division enum: 'Training', 'Minor', 'Major'
- Cannot delete if has players/games

**players**
- **Unique constraint**: (team_id, jersey_number)
- Age range: 7-22 (CHECK constraint)
- jersey_number can be NULL

**team_coaches**
- can_edit is ALWAYS false for coaches
- role enum: 'head_coach', 'assistant'
- Unique constraint: (team_id, user_id)

**games**
- References both home_team_id and away_team_id
- New field: scorekeeper_team_id
- scorekeeper_name is text (not a user reference)

**pitching_logs**
- final_pitch_count >= penultimate_batter_count (CHECK constraint)
- Links to player for age-based rest day calculations

**positions_played**
- Tracks inning-by-inning positions
- position enum: 'pitcher', 'catcher'
- Unique: (game_id, player_id, inning_number, position)

---

## Component Architecture

### Key React Components

**App.jsx** - Main app wrapper
- Handles authentication state
- Shows Login → ChangePassword → Dashboard flow
- Manages session and profile loading

**Dashboard.jsx** - Main layout
- Sidebar navigation
- Route management (via state, not React Router)
- User info display
- Sign out functionality

**UserManagement.jsx**
- Lists all users
- Calls Edge Function to create users (no more manual!)
- Generate temporary passwords
- Activate/deactivate users

**SeasonManagement.jsx**
- CRUD operations for seasons
- Set active season
- Validates deletion (checks for teams/games)

**TeamManagement.jsx**
- CRUD operations for teams
- Coach assignment modal
- Grouped by division display
- Validates deletion (checks for players/games)

**PlayerManagement.jsx**
- Single player add (form)
- **Bulk CSV import** (textarea with parsing)
- Jersey number uniqueness validation
- Displays errors in modal (not behind it)

**CoachManagement.jsx**
- Read-only view of all coaches
- Shows team assignments with details
- Links to User Management for adding coaches

**GameEntry.jsx**
- Two-step modal form
- Step 1: Basic game info
- Step 2: Player data for both teams
- Saves to multiple tables atomically

---

## Workflow Examples

### Creating a New Season
1. Admin logs in
2. Clicks Seasons → Create Season
3. Enters name, start date (end date optional)
4. Saves
5. Can set as active season

### Adding Players to Team
**Method 1: Individual**
1. Select season → Select team
2. Click Add Player
3. Enter name, age, jersey number
4. Save (validates jersey uniqueness)

**Method 2: Bulk CSV**
1. Select season → Select team  
2. Click "Bulk Add (CSV)"
3. Paste CSV data:
   ```
   John Smith, 12, 5
   Jane Doe, 11, 7
   Bob Johnson, 13
   ```
4. Submit (validates all at once)

### Entering a Game
1. Click Games → Enter New Game
2. **Step 1**: Fill basic info
   - Date
   - Scorekeeper name and team
   - Home/away teams and scores
   - Click "Next"
3. **Step 2**: For each team's players
   - Mark attendance
   - Check innings pitched/caught
   - Enter pitch counts for pitchers
   - Click "Complete & Save"
4. Data saved to games, game_players, pitching_logs, positions_played

---

## Known Issues & Workarounds

### 1. Tailwind v4 Incompatibility
**Issue**: PostCSS plugin error with Tailwind v4  
**Solution**: Lock to v3.4.1 in package.json  
```json
"tailwindcss": "^3.4.1"
```

### 2. Modal Error Display
**Issue**: Errors showed behind modal (z-index issue)  
**Solution**: Added local error state within each modal component

### 3. Blank Screen After Login
**Issue**: Profile loaded but UI didn't render  
**Solution**: Added null check: `{profile ? <Dashboard /> : null}`

### 4. User Creation Complexity
**Issue**: Required manual Supabase dashboard steps  
**Solution**: Built Edge Function for programmatic user creation

---

## File Organization Best Practices

### Component Structure
```
ComponentName/
├── ComponentName.jsx        # Main component
└── (sub-components inline)  # Modal forms, list items, etc.
```

We keep related modals in the same file as their parent component for easier maintenance.

### Import Patterns
```javascript
// Always use relative paths from component location
import { supabase } from '../../lib/supabase'  // For components in subdirectories
```

### State Management
- Local component state (useState) for form data
- Fetch fresh data after mutations
- Show success/error messages with auto-dismiss (3 seconds)

---

## Testing Checklist

### Phase 2 Functionality
- [ ] Create/edit/delete seasons
- [ ] Set active season (only one allowed)
- [ ] Create/edit/delete teams  
- [ ] Add players individually
- [ ] Bulk import players via CSV
- [ ] Duplicate jersey numbers rejected
- [ ] Assign coaches to teams
- [ ] View coach assignments
- [ ] Delete validations work (FK constraints)

### Phase 3 Functionality  
- [x] Enter basic game info
- [x] Enter player attendance
- [x] Enter pitching innings and counts
- [x] Enter catching innings
- [ ] View entered games (TODO)
- [ ] Edit game data (TODO)
- [ ] Rules validation (TODO)

---

## Next Development Priorities

### Immediate (Phase 3 Continuation)
1. **Game Detail View** - Click game to see all entered data
2. **Edit Game** - Modify existing game entries
3. **Delete Game** - With confirmation

### Short Term (Phase 4)
1. **Rest Day Calculator** - Based on pitch count and age
2. **Rule Validation** - Real-time during data entry
3. **Warning Flags** - Visual indicators for violations
4. **Catcher-to-Pitcher Rule** - If catch 4 innings, can't pitch

### Medium Term (Phase 5)
1. **PDF Reports** - Game data exports
2. **Player Stats** - Pitch count history, absences
3. **Compliance Dashboard** - At-a-glance rule adherence

---

## Success Metrics

**Achieved**:
- ✅ Zero-cost hosting (Supabase + Vercel free tiers)
- ✅ 50+ user accounts supported
- ✅ Sub-second page loads
- ✅ Mobile-responsive UI
- ✅ Complete Phase 1 and Phase 2 features
- ✅ No manual database work required for common tasks

**In Progress**:
- 🚧 Complete game entry workflow
- 🚧 Rules validation system

**Planned**:
- ⏳ PDF report generation
- ⏳ Statistical analysis tools

---

## Development Principles Followed

1. **Incremental Development** - Build, test, commit one feature at a time
2. **Database First** - Schema constraints prevent invalid data
3. **Security by Default** - RLS policies enforce access control
4. **User Feedback** - Immediate success/error messages
5. **Mobile Friendly** - Responsive design throughout
6. **Zero Cost** - All services on free tiers

---

**Project Owner**: James  
**Stack**: React + Supabase  
**Timeline**: Started December 2024  
**Status**: Actively developed, Phase 3 in progress
