# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            React App (Vite)                      │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │  Components                              │   │  │
│  │  │  ├─ Auth (Login, ChangePassword)        │   │  │
│  │  │  ├─ Admin (UserManagement)              │   │  │
│  │  │  ├─ Layout (Dashboard)                  │   │  │
│  │  │  └─ (More coming in Phase 2+)           │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                     ↕                            │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │  Supabase Client                         │   │  │
│  │  │  (Authentication + Database queries)     │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│                   SUPABASE CLOUD                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authentication Service                          │  │
│  │  ├─ User sign in/out                            │  │
│  │  ├─ Session management                          │  │
│  │  └─ Password updates                            │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↕                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                             │  │
│  │  ├─ user_profiles                               │  │
│  │  ├─ seasons                                     │  │
│  │  ├─ teams                                       │  │
│  │  ├─ players                                     │  │
│  │  ├─ games                                       │  │
│  │  ├─ pitching_logs                               │  │
│  │  ├─ positions_played                            │  │
│  │  └─ pitch_count_rules                           │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↕                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Row Level Security (RLS)                        │  │
│  │  ├─ Super admins: full access                   │  │
│  │  ├─ Admins: read/write all data                 │  │
│  │  └─ Coaches: team-specific access               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow - User Login

```
User enters credentials
         ↓
Login component
         ↓
Supabase.auth.signInWithPassword()
         ↓
Supabase Auth validates
         ↓
Returns session + user ID
         ↓
Query user_profiles table
         ↓
Check must_change_password?
         ↓
  ┌─────┴─────┐
  │           │
 YES         NO
  │           │
  ↓           ↓
ChangePassword  Dashboard
Component      Component
```

## Data Flow - Game Entry (Phase 3)

```
Scorekeeper fills form
         ↓
Submit game data
         ↓
┌────────────────────────────────┐
│  Single transaction creates:   │
│  1. Game record                │
│  2. Game attendance (both teams)│
│  3. Pitching logs              │
│  4. Positions played           │
└────────────────────────────────┘
         ↓
Rules engine validates
         ↓
Returns warnings if any
         ↓
Display confirmation
```

## Database Relationships

```
seasons
   ↓ has many
teams
   ↓ has many
players
   ↓ plays in
games
   ↓ has
   ├─ game_players (attendance)
   ├─ pitching_logs  
   └─ positions_played

teams
   ↓ assigned to
team_coaches
   ↓ references
user_profiles
   ↓ extends
auth.users (Supabase)
```

## Security Model

```
                 ┌──────────────┐
                 │ Request      │
                 └──────┬───────┘
                        ↓
              ┌─────────────────┐
              │ Is Authenticated?│
              └────┬────────┬────┘
                   │        │
                  NO       YES
                   │        ↓
            Reject  │  ┌──────────────┐
                    │  │ RLS Policy   │
                    │  │ Check Role   │
                    │  └──────┬───────┘
                    │         ↓
                    │   ┌─────────────────┐
                    │   │ Super Admin?    │
                    │   └────┬──────┬─────┘
                    │       YES    NO
                    │        │     ↓
                    │   Allow│  ┌──────────────┐
                    │   All  │  │ Admin?       │
                    │        │  └──┬──────┬────┘
                    │        │    YES     NO
                    │        │     │      ↓
                    │        │  Allow  ┌──────────────┐
                    │        │  Data   │ Coach on     │
                    │        │  Access │ this team?   │
                    │        │         └──┬──────┬────┘
                    │        │           YES     NO
                    │        │            │      │
                    │        └────────────┴──────┤
                    │                      Allow  │
                    │                      Team   │
                    │                      Data   │
                    └─────────────────────────────┘
                                                  ↓
                                              Reject
```

## Component Hierarchy

```
App.jsx (Main)
  │
  ├─ Login.jsx (if not authenticated)
  │
  ├─ ChangePassword.jsx (if password change required)
  │
  └─ Dashboard.jsx (if authenticated)
        │
        ├─ Header (user info, logout)
        │
        ├─ Sidebar (navigation)
        │
        └─ Main Content Area
              │
              ├─ HomeView
              │     └─ Welcome + Quick Start Guide
              │
              ├─ UserManagement (super admins only)
              │     ├─ User List Table
              │     └─ Add User Modal
              │
              ├─ Season Management (Phase 2)
              ├─ Team Management (Phase 2)
              ├─ Game Entry (Phase 3)
              └─ Reports (Phase 5)
```

## File Organization

```
baseball-app/
├── Documentation
│   ├── QUICKSTART.md     (Start here!)
│   ├── SETUP.md          (Detailed setup)
│   ├── README.md         (Full docs)
│   ├── CHECKLIST.md      (Track progress)
│   └── ARCHITECTURE.md   (This file)
│
├── database/
│   └── schema.sql        (Complete DB schema)
│
├── src/
│   ├── components/
│   │   ├── auth/         (Login, password)
│   │   ├── admin/        (User management)
│   │   └── layout/       (Dashboard, nav)
│   │
│   ├── lib/
│   │   └── supabase.js   (API client)
│   │
│   ├── App.jsx           (Main app logic)
│   ├── main.jsx          (React entry)
│   └── index.css         (Global styles)
│
└── Config Files
    ├── vite.config.js    (Build config)
    ├── tailwind.config.js (Styling)
    └── package.json       (Dependencies)
```

## Deployment Architecture (Future)

```
┌──────────────────┐
│   Developer      │
│   (You!)         │
└────────┬─────────┘
         │ git push
         ↓
┌──────────────────┐
│   GitHub         │
│   Repository     │
└────────┬─────────┘
         │ auto-deploy
         ↓
┌──────────────────┐
│   Vercel         │ ← Frontend hosting (free)
│   (React app)    │
└────────┬─────────┘
         │ API calls
         ↓
┌──────────────────┐
│   Supabase       │ ← Backend (free tier)
│   (Auth + DB)    │
└──────────────────┘
```

## Technology Choices - Why?

| Technology | Why Chosen |
|-----------|-----------|
| React | Modern, component-based, large ecosystem |
| Vite | Fast dev server, modern build tool |
| Supabase | Backend-as-a-service, generous free tier, PostgreSQL |
| Tailwind CSS | Utility-first, rapid UI development |
| Vercel | Zero-config React deployment, free tier |

## Scalability

Current design handles:
- ✅ 50 users per season (your requirement)
- ✅ 10-20 teams
- ✅ 200-300 players
- ✅ 100+ games per season
- ✅ Thousands of pitch count logs

Free tier limits:
- Supabase: 500MB database, 50K monthly active users
- Vercel: 100GB bandwidth/month
- More than enough for multiple seasons!
