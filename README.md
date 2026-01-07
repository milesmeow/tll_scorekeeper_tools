# ⚾ Baseball Team Management App

A comprehensive web application for managing baseball teams, tracking pitch counts, monitoring player compliance with Pitch Smart guidelines, and managing game data.

## Current Status: Phases 1, 2 & 3 Complete

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

#### Phase 3: Game Entry (Complete)
- ✅ **Basic Game Entry** - Date, teams, scores, scorekeeper info
- ✅ **Player Data Entry** - Attendance, innings pitched/caught, pitch counts
- ✅ **Game Viewing** - View complete game details
- ✅ **Game Editing** - Edit all game data
- ✅ **Game Deletion** - Delete games with confirmation

#### Phase 3.5: Data Export Tools (Complete)
- ✅ **Tools Section** - Admin-only tools accessible from dashboard sidebar
- ✅ **JSON Backup Export** - Complete season data export for backup/restore
- ✅ **CSV Export** - Multiple CSV files (season, teams, players, games, etc.) packaged in ZIP
- ✅ **HTML Report Export** - Formatted, human-readable season report with:
  - Teams overview and detailed rosters
  - Games organized by division (Training, Minor, Major)
  - Pitching logs organized by division
  - Coach assignments per team
  - Print-friendly styling
- ✅ **Timezone-Correct Dates** - Uses `parseLocalDate()` utility to prevent date offset issues
- ✅ **Timestamped Filenames** - All exports include date and time (YYYY-MM-DD_HH-MM-SS)

### 🚧 Upcoming Features

#### Phase 4: Rules Engine (Planned)
- Automatic Pitch Smart compliance checking
- Rest day calculations based on pitch counts and age
- Violation warnings (e.g., 4 innings catching → can't pitch, 41+ pitches → can't catch)
- Rule flags on game entry
- **See RULES.md for complete rule documentation**

#### Phase 5: Advanced Reporting & Data Management (Planned)
- Import season data from backup JSON files
- Player statistics dashboards (absences, pitch counts, playing time)
- Compliance reports with rule violation summaries
- Additional export formats (Excel with formulas, custom date ranges)

## Tools Section (Admin Only)

### Overview
The Tools section provides data export functionality for admins and super admins. Access it from the dashboard sidebar (🛠️ Tools).

### Export Features

#### 1. JSON Backup Export
**Purpose**: Complete season data backup for archival or future import functionality
**Output**: Single JSON file with all related data
**Filename**: `backup_SeasonName_YYYY-MM-DD_HH-MM-SS.json`
**Contains**:
- Season metadata
- All teams with their divisions
- Complete player rosters
- Team coach assignments
- All games with scores
- Player attendance records (game_players)
- Pitching logs (pitch counts and rest dates)
- Positions played by inning

**Use Case**: Create backups before major changes, archive completed seasons, prepare for future import feature

#### 2. CSV Export
**Purpose**: Spreadsheet-friendly format for data analysis
**Output**: ZIP file containing 8 CSV files
**Filename**: `csv_export_SeasonName_YYYY-MM-DD_HH-MM-SS.zip`
**Files Included**:
- `season.csv` - Season details
- `teams.csv` - All teams
- `players.csv` - All players with ages and jersey numbers
- `team_coaches.csv` - Coach assignments with names and emails
- `games.csv` - All games with dates, teams, and scores
- `game_players.csv` - Player attendance records
- `pitching_logs.csv` - Pitch counts and eligibility dates
- `positions_played.csv` - Position tracking by inning

**Use Case**: Analyze data in Excel/Google Sheets, create custom reports, share data with other tools

#### 3. HTML Report Export
**Purpose**: Human-readable, formatted season report
**Output**: Single HTML file viewable in any browser
**Filename**: `report_SeasonName_YYYY-MM-DD_HH-MM-SS.html`
**Sections**:
- Season overview with dates and status
- Teams Overview table (Name, Division, Player Count)
- Detailed team sections with:
  - Coach assignments (Name, Email, Role)
  - Complete roster with jersey numbers
  - Team's game schedule
- Games by Division (Training, Minor, Major)
  - Chronologically ordered within each division
  - Shows Date, Home Team, Away Team, Score, Scorekeeper
- Pitching Logs by Division
  - Shows Date, Player, Game, Final Pitch Count, Official Pitch Count, Next Eligible Date
  - Official Pitch Count = Penultimate Batter Count + 1 (per Pitch Smart rules)

**Features**:
- Print-friendly styling with proper page breaks
- Color-coded division badges
- Responsive design for mobile viewing
- All dates use local timezone (no UTC offset issues)

**Use Case**: Share with league officials, print for physical records, review season at a glance

### Date Handling
All exports use the `parseLocalDate()` utility function to ensure dates display correctly without timezone offset issues. This prevents the common problem where database dates (stored as YYYY-MM-DD) appear one day earlier due to UTC conversion.

### Access Control
- Only users with `admin` or `super_admin` roles can access the Tools section
- Tools menu item only appears in dashboard sidebar for authorized users
- Coaches do not have access to export functionality

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
- **Export Tools**: JSZip 3.10.1 (for CSV ZIP file generation)
- **Hosting**: Vercel (frontend) + Supabase (backend)
- **Cost**: $0/month on free tiers

## Database Schema

### Core Tables (10 total)

1. **user_profiles** - User accounts and roles (RLS enabled with recursion prevention)
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

All tables including `user_profiles` have Row Level Security (RLS) enabled. To prevent infinite recursion when RLS policies check user roles, we use a three-layer architecture:

**Three-Layer RLS Architecture:**

1. **Layer 1: Private RLS-Bypass Function**
   - `private.get_user_info(user_id)` - Internal function that bypasses RLS using `SET LOCAL row_security = off`
   - SECURITY DEFINER with revoked public access
   - Only returns role and is_active status

2. **Layer 2: Public Helper Functions**
   ```sql
   public.is_admin() -- Returns true if user is super_admin or admin
   public.is_super_admin() -- Returns true if user is super_admin
   ```
   - These functions call `get_user_info()` instead of directly querying user_profiles
   - Breaks the recursion cycle

3. **Layer 3: RLS Policies**
   - All tables including user_profiles have RLS enabled
   - Policies use helper functions without causing recursion
   - Coaches get read-only access to assigned teams
   - Admins get full access to everything

**Why This Works:**
- Helper functions no longer query user_profiles directly (which would trigger RLS)
- They use the private bypass function instead
- RLS policies can safely use helper functions without infinite loops
- Resolves Supabase security warnings while maintaining protection

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
│   │   ├── games/
│   │   │   └── GameEntry.jsx         # Two-step game entry form
│   │   ├── tools/
│   │   │   └── ToolsManagement.jsx   # Admin tools for data export
│   │   └── reports/
│   │       └── Reports.jsx           # Game lists and player absence reports
│   ├── lib/
│   │   ├── supabase.js              # API client
│   │   ├── exportUtils.js           # Season data export functions
│   │   └── pitchCountUtils.js       # Date parsing and pitch count utilities
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
**Solution**: Three-layer architecture with private.get_user_info() bypassing RLS internally

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

## Next Steps (Phase 4 - Rules Engine)

1. **Rules Validation** - Real-time Pitch Smart compliance checking during game entry
2. **Rest Day Calculator** - Calculate required rest days based on pitch counts and age
3. **Warning System** - Flag rule violations during data entry
4. **Compliance Dashboard** - Overview of rule adherence across teams

## Support & Documentation

- **Setup Issues**: See QUICKSTART.md
- **Architecture**: See ARCHITECTURE.md
- **Summary**: See PROJECT_SUMMARY.md
- **Game Rules**: See RULES.md (pitching/catching restrictions, Pitch Smart guidelines)
- **Database**: See database/schema.sql with comments

## License

Private/Proprietary

---

**Current Version**: Phases 1, 2, 3, & 3.5 Complete (as of Jan 2026)
- Added Tools section with JSON, CSV, and HTML export functionality
