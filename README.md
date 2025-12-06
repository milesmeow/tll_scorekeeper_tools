# ⚾ Baseball Team Management App

A comprehensive web application for managing baseball teams, tracking pitch counts, monitoring player compliance with Pitch Smart guidelines, and managing game data.

## Features

### Phase 1 (Current) ✅
- **User Authentication** - Secure login with Supabase
- **User Management** - Super admins can create and manage users
- **Role-Based Access Control** - Super Admin, Admin, Coach, Scorekeeper roles
- **Password Management** - Forced password change on first login

### Phase 2 (Next)
- **Season Management** - Create and manage seasons
- **Team Management** - Organize teams by division (Training, Minor, Major)
- **Player Rosters** - Track players with ages and jersey numbers
- **Coach Assignments** - Assign coaches to teams with permissions

### Phase 3 (Upcoming)
- **Game Entry** - Record scores, attendance, positions
- **Pitch Count Tracking** - Log pitch counts per game
- **Attendance Tracking** - Mark players present/absent with notes

### Phase 4 (Upcoming)
- **Rules Engine** - Automatic Pitch Smart compliance checking
- **Rest Day Calculations** - Track mandatory rest based on pitch counts
- **Violation Warnings** - Flag rule violations (4 innings catching → no pitching)

### Phase 5 (Upcoming)
- **PDF Reports** - Export season data in readable format
- **Player Statistics** - Absences, pitch counts, playing time
- **Compliance Reports** - Track rule adherence

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (frontend) + Supabase (backend)

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Prerequisites
- Node.js 18+
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd baseball-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
- Create a new Supabase project
- Run `database/schema.sql` in SQL Editor
- Get your API keys from Settings > API

4. **Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

5. **Create your first super admin**
Follow instructions in SETUP.md Step 3

6. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:5173`

## Project Structure

```
baseball-app/
├── database/
│   └── schema.sql              # Database schema
├── src/
│   ├── components/
│   │   ├── auth/              # Authentication components
│   │   ├── admin/             # Admin features
│   │   ├── layout/            # Layout components
│   │   └── (more coming)      # Features for future phases
│   ├── lib/
│   │   └── supabase.js        # Supabase client
│   ├── App.jsx                # Main app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## User Roles

### Super Admin
- Create and manage all users
- Full access to all features
- Can't be deactivated by other users

### Admin
- Full read/write access to all teams and games
- Cannot manage users

### Coach / Scorekeeper
- Assigned to specific teams
- Can have read-only or read-write access
- Permissions set by admins

## Database Schema

### Core Tables
- `user_profiles` - User accounts and roles
- `seasons` - Season definitions
- `teams` - Teams within seasons
- `team_coaches` - Coach assignments and permissions
- `players` - Player rosters
- `games` - Game records
- `game_players` - Attendance tracking
- `pitching_logs` - Pitch count data
- `positions_played` - Position tracking by inning
- `pitch_count_rules` - Pitch Smart guidelines

See `database/schema.sql` for complete schema with Row Level Security policies.

## Pitch Smart Guidelines

The app enforces MLB/USA Baseball Pitch Smart Guidelines:

| Age   | Max Pitches | Rest Days by Pitch Count |
|-------|-------------|--------------------------|
| 7-8   | 50          | 1-20: 0d, 21-35: 1d, 36-50: 2d |
| 9-10  | 75          | 1-20: 0d, 21-35: 1d, 36-50: 2d, 51-65: 3d, 66+: 4d |
| 11-12 | 85          | 1-20: 0d, 21-35: 1d, 36-50: 2d, 51-65: 3d, 66+: 4d |
| 13-14 | 95          | 1-20: 0d, 21-35: 1d, 36-50: 2d, 51-65: 3d, 66+: 4d |
| 15-16 | 95          | 1-30: 0d, 31-45: 1d, 46-60: 2d, 61-75: 3d, 76+: 4d |
| 17-18 | 105         | 1-30: 0d, 31-45: 1d, 46-60: 2d, 61-80: 3d, 81+: 4d |
| 19-22 | 120         | 1-30: 0d, 31-45: 1d, 46-60: 2d, 61-80: 3d, 81-105: 4d, 106+: 5d |

## Development Roadmap

- [x] Phase 1: Authentication & User Management
- [ ] Phase 2: Seasons, Teams & Players
- [ ] Phase 3: Game Entry & Data Collection
- [ ] Phase 4: Rules Engine & Validation
- [ ] Phase 5: Reports & Exports

## Contributing

This is a custom application. For questions or feature requests, contact the development team.

## License

Private/Proprietary

## Support

For issues or questions:
1. Check SETUP.md for setup issues
2. Review database schema in schema.sql
3. Contact the development team
