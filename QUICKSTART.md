# 🚀 QUICKSTART - Baseball Team Manager

**Get up and running in 15 minutes**

---

## Prerequisites

- Node.js 18+ installed
- Supabase account (free)
- Your Supabase project already created

---

## Step 1: Clone & Install (2 minutes)

```bash
git clone <your-repo-url>
cd baseball-app
npm install
```

---

## Step 2: Configure Supabase (5 minutes)

### A. Run Database Schema

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy entire contents of `database/schema.sql`
5. Paste and click **Run**
6. Should see: "Success. No rows returned"

### B. Deploy Edge Function

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **Create a new function**
3. Name it: `create-user`
4. Replace code with contents from edge function (see below)
5. Click **Deploy**

**Edge Function Code** (save as `index.ts`):
```typescript
// See ARCHITECTURE.md for full Edge Function code
// Or check Supabase Dashboard → Edge Functions → create-user
```

### C. Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJxxx...`

---

## Step 3: Environment Setup (1 minute)

Create `.env.local` in `baseball-app/`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxx
```

⚠️ Replace with YOUR actual values from Step 2C

---

## Step 4: Create Super Admin (3 minutes)

### A. Create Auth User

1. Supabase Dashboard → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter:
   - Email: `your@email.com`
   - Password: `TempPassword123`
   - ✓ Check **Auto Confirm User**
4. Click **Create user**
5. **COPY THE UUID** (you need it next!)

### B. Create User Profile

1. Go to **Table Editor** → **user_profiles**
2. Click **Insert** → **Insert row**
3. Fill in:
   - **id**: Paste UUID from above
   - **email**: `your@email.com`
   - **name**: Your Name
   - **role**: `super_admin`
   - **is_active**: `true`
   - **must_change_password**: `false`
4. Click **Save**

✅ You now have a super admin account!

---

## Step 5: Start the App (1 minute)

```bash
npm run dev
```

Open browser to: **http://localhost:5173**

---

## Step 6: First Login (1 minute)

1. Login with:
   - Email: `your@email.com`
   - Password: `TempPassword123`
2. You should see the Dashboard! 🎉

---

## Quick Feature Tour (2 minutes)

### Try These Actions:

1. **Create a User** (now works from the app!)
   - Click **User Management**
   - Click **+ Add User**
   - Fill form, click **Generate** for password
   - Click **Create User**

2. **Create a Season**
   - Click **Seasons**
   - Click **+ Create Season**
   - Enter name and start date
   - Save

3. **Create a Team**
   - Click **Teams**
   - Select your season
   - Click **+ Create Team**
   - Enter name and division

4. **Add Players**
   - Click **Players**
   - Select season and team
   - Try **+ Add Player** (single)
   - Try **📋 Bulk Add (CSV)** (multiple)

---

## Common Issues & Fixes

### "Invalid API key"
- Double-check `.env.local` file
- Restart dev server: `Ctrl+C` then `npm run dev`

### "Permission denied"
- Make sure you ran **entire** `schema.sql`
- Check user_profiles has your super admin entry

### "Can't log in"
- Verify user exists in **auth.users**
- Verify matching entry in **user_profiles**
- Check `is_active = true`

### Tailwind not working
- Ensure `package.json` has `tailwindcss@3.4.1` (NOT v4)
- Run `npm install` again if needed

---

## What's Next?

You're ready to use the app! Try:

1. **Create your league structure**
   - Add your season
   - Add all teams
   - Add players (use CSV for speed!)

2. **Assign coaches**
   - Create coach users
   - Assign them to teams

3. **Enter game data**
   - Click **Games**
   - Enter game info and player data

---

## Feature Summary

### ✅ What Works Now

**Phase 1 (Complete)**
- User login/logout
- Password changes
- Create users from app (via Edge Function)

**Phase 2 (Complete)**
- Season management (create, edit, delete, set active)
- Team management (create, edit, delete, by division)
- Player management (individual + bulk CSV import)
- Coach management (view and assign to teams)

**Phase 3 (Complete)**
- ✅ Game entry (basic info + player data)
- ✅ Game viewing with full details
- ✅ Game editing
- ✅ Game deletion

### 🚧 Coming Soon

**Phase 4 (Next)**
- Pitch Smart rule validation
- Rest day calculations
- Warning flags

**Phase 5**
- PDF reports
- Player statistics
- Compliance dashboards

---

## Key Reminders

### User Roles
- **Super Admin**: Full access + user management
- **Admin**: Full data access, no user management
- **Coach**: Read-only access to assigned teams

### Design Notes
- Scorekeepers are NOT users (just text when entering games)
- Coaches are always read-only (can't edit data)
- Jersey numbers must be unique per team
- Only one season can be active at a time

---

## Need Help?

1. Check error message in browser console (F12)
2. Check Supabase Dashboard → Logs
3. Review `README.md` for detailed docs
4. Review `ARCHITECTURE.md` for system design
5. Review `PROJECT_SUMMARY.md` for context

---

## Next Steps After Setup

Once everything is running:

1. **Create your league data**
   - Seasons, teams, players
   
2. **Assign coaches**
   - Create coach accounts
   - Assign to teams
   
3. **Start entering games**
   - Record game data
   - Track pitch counts

4. **Ready for Phase 4?**
   - Rules validation coming next!

---

**Setup Time**: ~15 minutes  
**Result**: Fully functional team management system!  
**Cost**: $0/month (free tiers)

🎉 **You're all set - enjoy managing your baseball teams!**
