# 🚀 QUICKSTART - Baseball Team Manager

**Get up and running in 20 minutes**

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

## Step 2: Configure Supabase (10 minutes)

### A. Run Database Schema

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy entire contents of `database/schema.sql`
5. Paste and click **Run**
6. Should see: "Success. No rows returned"

### B. Deploy Edge Functions

#### Overview

Your app needs **two Edge Functions** for user management:

- `create-user` - Creates new users with auth accounts
- `reset-password` - Allows super admins to reset user passwords

⚠️ **Why Edge Functions?** The client-side cannot access `auth.users` table (requires service role key). Edge Functions use a service role to safely create/modify users.

**Time**: 5-7 minutes (choose Dashboard OR CLI method below)

---

#### Method 1: Dashboard Deployment (Recommended for Beginners)

**Deploy create-user function:**

1. Open **Supabase Dashboard** → **Edge Functions**
2. Click **Create a new function**
3. Name it exactly: `create-user` (critical!)
4. Copy the entire code from `/database/create-user-edge-function.ts` in your project
5. Paste it into the function editor
6. Click **Deploy**
7. ✅ You should see: Function deployed successfully

**Deploy reset-password function:**

1. Still in **Edge Functions**, click **Create a new function** again
2. Name it exactly: `reset-password` (critical!)
3. Copy the entire code from `/database/reset-password-edge-function.ts` in your project
4. Paste it into the function editor
5. Click **Deploy**
6. ✅ You should see: Function deployed successfully

**Verify deployment:**

- You should now see both functions listed: `create-user` and `reset-password`
- Each will show a green "Deployed" status
- Note the endpoint URLs - they should match:
  - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-user`
  - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-password`

---

#### Method 2: CLI Deployment (Advanced - Optional)

**Prerequisites:**

- Node.js 18+ (already installed from Step 1)
- Supabase CLI (we'll install it)

**Install Supabase CLI:**

```bash
# Install globally
npm install -g supabase

# Verify installation
supabase --version
```

**Login and link project:**

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

💡 Find your project ref: **Settings → General → Reference ID**

**Deploy functions:**

⚠️ **Note**: The current project structure has edge functions as `.ts` files in `database/`. For CLI deployment, you'll need to organize them into Supabase's expected structure:

```bash
# Create functions directory structure
mkdir -p supabase/functions/create-user
mkdir -p supabase/functions/reset-password

# Copy function code (rename to index.ts)
cp database/create-user-edge-function.ts supabase/functions/create-user/index.ts
cp database/reset-password-edge-function.ts supabase/functions/reset-password/index.ts

# Deploy both functions
supabase functions deploy create-user --no-verify-jwt
supabase functions deploy reset-password --no-verify-jwt
```

💡 `--no-verify-jwt` flag is needed because these functions handle their own authorization

**Verify deployment:**

```bash
supabase functions list

# Expected output:
# NAME              VERSION    CREATED AT
# create-user       1          [timestamp]
# reset-password    1          [timestamp]
```

---

#### Environment Variables (Auto-Configured)

Good news! Supabase automatically injects these environment variables into your Edge Functions:

- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (bypasses RLS)

**No manual configuration needed.** The functions access these via `Deno.env.get()`.

🔒 **Security Note**: Service role key bypasses Row Level Security. Edge functions verify super_admin role before allowing operations.

---

#### Testing Your Functions (Optional but Recommended)

**Get your session token:**

1. Start your app: `npm run dev`
2. Login as your super admin at `http://localhost:5173`
3. Open browser console (F12)
4. Run this command:

```javascript
(await supabase.auth.getSession()).data.session.access_token;
```

5. Copy the token (starts with `eyJ...`)

**Test create-user function:**

```bash
curl -X POST https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "name": "Test User",
    "role": "coach"
  }'
```

**Expected response (200 Success):**

```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "role": "coach"
  }
}
```

**If not super_admin (403 Forbidden):**

```json
{
  "error": "Only super admins can create users"
}
```

**Test reset-password function:**

```bash
curl -X POST https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "userId": "USER_UUID_HERE",
    "newPassword": "NewPassword123"
  }'
```

**Expected response (200 Success):**

```json
{
  "success": true,
  "message": "Password reset successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

---

#### Troubleshooting

| Issue            | Cause                           | Solution                                                       |
| ---------------- | ------------------------------- | -------------------------------------------------------------- |
| 401 Unauthorized | Missing or invalid Bearer token | Get fresh token from browser console                           |
| 403 Forbidden    | Not a super_admin               | Verify `user_profiles.role = 'super_admin'` in Table Editor    |
| 404 Not Found    | Function not deployed           | Check function name exactly: `create-user` or `reset-password` |
| 500 Server Error | Missing environment variables   | Check **Dashboard → Edge Functions → Logs** for details        |
| CORS error       | Browser blocking request        | Use curl for testing, not browser fetch()                      |

**Additional help:**

- **View function logs**: Dashboard → Edge Functions → Select function → Logs tab
- **Redeploy**: Click function name → Edit → Deploy button
- **Supabase docs**: https://supabase.com/docs/guides/functions

✅ **Edge Functions deployed!** You can now create and manage users from the app UI.

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

**Phase 4 (Complete)**

- ✅ Pitch Smart rule validation
- ✅ Rest day calculations
- ✅ Warning flags

**Phase 5 (Complete)**

- ✅ PDF reports

### 🚧 Coming Soon

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
