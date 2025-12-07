# ⚾ Baseball Team Management App

A comprehensive web application for managing baseball teams, tracking pitch counts, monitoring player compliance with Pitch Smart guidelines, and managing game data.

## Current Status: Phase 2 Complete + Phase 3 In Progress

### ✅ Completed Features

#### Phase 1: Foundation (Complete)
- **User Authentication** - Supabase-based login with forced password change
- **User Management** - Super admins can create users via Edge Function
- **Role-Based Access Control** - Super Admin, Admin, Coach roles
- **Database Schema** - Complete with RLS policies (fixed for production)

#### Phase 2: Data Management (Complete)
- **Season Management** - Create, edit, delete seasons; set active season
- **Team Management** - Organize by division (Training, Minor, Major)
- **Player Management** - Individual add, bulk CSV import, edit/delete
- **Coach Management** - View coaches and their team assignments
- **Coach Assignments** - Assign coaches to teams (always read-only access)

#### Phase 3: Game Entry (In Progress)
- **Basic Game Entry** - Date, teams, scores, scorekeeper info
- **Player Data Entry** - Attendance, innings pitched/caught, pitch counts
- ⏳ **Game Viewing/Editing** - Still to be built
- ⏳ **Rules Validation** - Still to be built

### 🚧 Upcoming Features

#### Phase 4: Rules Engine (Planned)
- Automatic Pitch Smart compliance checking
- Rest day calculations based on pitch counts and age
- Violation warnings (e.g., 4 innings catching → can't pitch)
- Rule flags on game entry

#### Phase 5: Reporting (Planned)
- PDF exports of season data
- Player statistics (absences, pitch counts, playing time)
- Compliance reports

## Key Design Decisions

### User Roles & Permissions

**Login Accounts (user_profiles):**
- **Super Admin** - Full access + user management
- **Admin** - Full data access, no user management
- **Coach** - Read-only access to assigned teams only

**Non-Login Entities:**
- **Scorekeepers** - Just names (text field) when entering game data, not user accounts

### Important Constraints

1. **Jersey Numbers** - Unique per team (database constraint enforced)
2. **Coaches** - Always read-only, no edit permissions
3. **Season End Dates** - Optional (NULL allowed)
4. **Active Season** - Only one season can be active at a time (unique partial index)
5. **Deletion Rules**:
   - Can't delete season if it has teams/games
   - Can't delete team if it has players/games
   - Can't delete player if they have game records

### Edge Functions

**create-user** - Deployed Supabase Edge Function
- URL: `https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/create-user`
- Purpose: Allows super admins to create users from the app
- Auth: Requires super_admin role
- Creates both auth.users entry and user_profiles entry atomically

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Styling**: Tailwind CSS 3.4.1 (NOT v4 - causes PostCSS issues)
- **Hosting**: Vercel (frontend) + Supabase (backend)
- **Cost**: $0/month on free tiers

## Database Schema

### Core Tables (10 total)

1. **user_profiles** - User accounts and roles (NO RLS to avoid recursion)
2. **seasons** - Season definitions with unique active season constraint
3. **teams** - Teams within seasons (by division)
4. **team_coaches** - Coach-to-team assignments (always can_edit=false)
5. **players** - Player rosters (unique jersey per team)
6. **games** - Game records with scorekeeper info
7. **game_players** - Attendance tracking with absence notes
8. **pitching_logs** - Pitch counts (final + penultimate batter)
9. **positions_played** - Position tracking by inning (pitcher/catcher)
10. **pitch_count_rules** - Pitch Smart guidelines (reference data)

### Key Schema Changes from Original Design

1. **seasons.end_date** - Changed to allow NULL (optional)
2. **games.scorekeeper_team_id** - Added to track which team scorekeeper belongs to
3. **user_profiles.role** - Removed 'scorekeeper' option (scorekeepers are not users)
4. **team_coaches.role** - Removed 'scorekeeper' option
5. **players** - Added unique constraint: `(team_id, jersey_number)`
6. **seasons.is_active** - Enforced via unique partial index instead of CHECK constraint

### RLS Policy Approach

**Helper Functions (avoids recursion):**
```sql
public.is_admin() -- Returns true if user is super_admin or admin
public.is_super_admin() -- Returns true if user is super_admin
```

**Security Model:**
- user_profiles: NO RLS (protected by authentication)
- All other tables: RLS enabled with policies using helper functions
- Coaches get read-only access to assigned teams
- Admins get full access to everything

## Project Structure

```
baseball-app/
├── database/
│   └── schema.sql              # Complete DB schema with fixed RLS
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.jsx       # Authentication
│   │   │   └── ChangePassword.jsx
│   │   ├── admin/
│   │   │   └── UserManagement.jsx  # Create/manage users (uses Edge Function)
│   │   ├── layout/
│   │   │   └── Dashboard.jsx   # Main layout with navigation
│   │   ├── seasons/
│   │   │   └── SeasonManagement.jsx  # CRUD seasons
│   │   ├── teams/
│   │   │   └── TeamManagement.jsx    # CRUD teams + coach assignments
│   │   ├── players/
│   │   │   └── PlayerManagement.jsx  # CRUD players + CSV bulk import
│   │   ├── coaches/
│   │   │   └── CoachManagement.jsx   # View coaches and assignments
│   │   └── games/
│   │       └── GameEntry.jsx         # Two-step game entry form
│   ├── lib/
│   │   └── supabase.js         # API client
│   ├── App.jsx                 # Main app with auth flow
│   ├── main.jsx                # Entry point
│   └── index.css               # Tailwind + custom styles
├── .env.local                  # Supabase credentials (not in repo)
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account

### Setup (10 minutes)

1. **Clone repo and install**
```bash
git clone <repo-url>
cd baseball-app
npm install
```

2. **Set up Supabase**
- Create Supabase project
- Run `database/schema.sql` in SQL Editor
- Get API keys from Settings → API

3. **Configure environment**
```bash
# Create .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

4. **Deploy Edge Function**
- Go to Edge Functions in Supabase Dashboard
- Create function named `create-user`
- Paste code from edge function docs
- Deploy

5. **Create first super admin**
```sql
-- In Supabase: Authentication → Users → Add user
-- Then in SQL Editor:
INSERT INTO user_profiles (id, email, name, role, is_active, must_change_password)
VALUES (
  'UUID_FROM_AUTH_USERS',
  'your@email.com',
  'Your Name',
  'super_admin',
  true,
  false
);
```

6. **Start app**
```bash
npm run dev
```

## Known Issues & Solutions

### Issue: Tailwind PostCSS Error
**Solution**: Must use Tailwind v3.4.1 (NOT v4)
```bash
npm install tailwindcss@3.4.1 -D
```

### Issue: RLS Infinite Recursion
**Solution**: user_profiles table has NO RLS, uses helper functions for other tables

### Issue: Can't Create Users from App
**Solution**: Edge Function `create-user` uses service role key securely

### Issue: Duplicate Jersey Numbers
**Solution**: Database constraint `unique_jersey_per_team` enforces uniqueness

## Pitch Smart Guidelines (Embedded in Database)

| Age   | Max Pitches | Rest Days by Pitch Count |
|-------|-------------|--------------------------|
| 7-8   | 50          | 1-20: 0d, 21-35: 1d, 36-50: 2d |
| 9-10  | 75          | 1-20: 0d, 21-35: 1d, 36-50: 2d, 51-65: 3d, 66+: 4d |
| 11-12 | 85          | 1-20: 0d, 21-35: 1d, 36-50: 2d, 51-65: 3d, 66+: 4d |
| 13-14 | 95          | 1-20: 0d, 21-35: 1d, 36-50: 2d, 51-65: 3d, 66+: 4d |
| 15-16 | 95          | 1-30: 0d, 31-45: 1d, 46-60: 2d, 61-75: 3d, 76+: 4d |
| 17-18 | 105         | 1-30: 0d, 31-45: 1d, 46-60: 2d, 61-80: 3d, 81+: 4d |
| 19-22 | 120         | 1-30: 0d, 31-45: 1d, 46-60: 2d, 61-80: 3d, 81-105: 4d, 106+: 5d |

## Development Workflow

### Incremental Development Pattern
We follow a step-by-step approach:
1. Build one feature at a time
2. Test immediately after each addition
3. Make incremental commits
4. Get feedback before moving to next feature

### File Modification Pattern
Changes are provided as:
- Specific file paths
- Exact code changes (not full file downloads)
- Clear before/after snippets
- Works well with Git workflow

## Next Steps (Phase 3 Continuation)

1. **Game Viewing** - Display entered games with all details
2. **Game Editing** - Allow corrections to game data
3. **Rules Validation** - Real-time Pitch Smart compliance checking
4. **Warning System** - Flag rule violations during data entry

## Support & Documentation

- **Setup Issues**: See QUICKSTART.md
- **Architecture**: See ARCHITECTURE.md  
- **Summary**: See PROJECT_SUMMARY.md
- **Database**: See database/schema.sql with comments

## License

Private/Proprietary

---

**Current Version**: Phase 2 Complete, Phase 3 In Progress (as of Dec 2024)
