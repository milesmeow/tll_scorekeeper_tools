# Baseball Team Management App - Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)
- Git (optional)

---

## Step 1: Set Up Supabase

### 1.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: Baseball Team Manager
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to you
4. Click "Create new project" (takes ~2 minutes)

### 1.2 Run the Database Schema

1. In your Supabase project, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `database/schema.sql`
4. Paste into the SQL editor
5. Click **Run** (bottom right)
6. You should see "Success. No rows returned"

### 1.3 Configure Authentication

1. Go to **Authentication** > **Providers** (left sidebar)
2. Make sure **Email** is enabled (it should be by default)
3. Go to **Authentication** > **URL Configuration**
4. Set **Site URL**: `http://localhost:5173` (for development)

### 1.4 Get Your API Keys

1. Go to **Settings** > **API** (left sidebar)
2. Copy these values (you'll need them soon):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

---

## Step 2: Set Up the React App

### 2.1 Install Dependencies

```bash
cd baseball-app
npm install
```

### 2.2 Configure Environment Variables

1. Create a file named `.env.local` in the `baseball-app` directory
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the values with what you copied from Step 1.4.

⚠️ **Important**: Never commit `.env.local` to Git (it's already in `.gitignore`)

---

## Step 3: Create Your First Super Admin User

Since you need a super admin to create other users, we'll create one directly in Supabase:

### 3.1 Create Auth User

1. In Supabase, go to **Authentication** > **Users**
2. Click **Add user** > **Create new user**
3. Enter:
   - **Email**: your email
   - **Password**: temporary password
   - **Auto Confirm User**: ✓ (check this box)
4. Click **Create user**
5. **Copy the User UUID** (you'll need it in the next step)

### 3.2 Create User Profile

1. Go to **Table Editor** > **user_profiles**
2. Click **Insert** > **Insert row**
3. Fill in:
   - **id**: paste the UUID you just copied
   - **email**: your email (same as above)
   - **name**: your name
   - **role**: `super_admin`
   - **is_active**: `true`
   - **must_change_password**: `false`
4. Click **Save**

✅ **You now have a super admin account!**

---

## Step 4: Run the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

---

## Step 5: First Login & Test

1. Open the app at `http://localhost:5173`
2. Log in with the email/password you created
3. You should see the admin dashboard
4. Try creating a new user to test the user management system

---

## Project Structure

```
baseball-app/
├── database/
│   └── schema.sql          # Database schema (already created)
├── src/
│   ├── components/         # React components
│   │   ├── auth/          # Login, password change
│   │   ├── admin/         # User management
│   │   ├── seasons/       # Season management
│   │   ├── teams/         # Team management
│   │   ├── games/         # Game entry forms
│   │   └── common/        # Shared components
│   ├── lib/
│   │   ├── supabase.js    # Supabase client
│   │   └── utils.js       # Helper functions
│   ├── hooks/             # Custom React hooks
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── .env.local             # Your API keys (you'll create this)
├── package.json
└── vite.config.js
```

---

## Next Steps

Once everything is running:

1. **Phase 1** ✓ (You are here)
   - Database created
   - Authentication working
   - User management working

2. **Phase 2** (Next)
   - Create seasons
   - Create teams
   - Add players

3. **Phase 3**
   - Game entry forms
   - Pitch count tracking

4. **Phase 4**
   - Rules engine
   - Validation warnings

5. **Phase 5**
   - PDF reports
   - Data exports

---

## Troubleshooting

### "Invalid API key" error
- Double-check your `.env.local` file
- Make sure you copied the **anon/public** key, not the service role key
- Restart the dev server after changing `.env.local`

### "Row Level Security" errors
- Make sure you ran the entire `schema.sql` file
- Check that your user has `super_admin` role in the `user_profiles` table

### Can't log in
- Verify the user exists in **Authentication** > **Users**
- Verify the user profile exists in **user_profiles** table with matching UUID
- Check that `is_active` is `true`

### Need help?
Share the specific error message and I'll help you debug!

---

## Production Deployment (Later)

When you're ready to deploy:

1. **Update Supabase Auth URLs**:
   - Site URL: your production domain
   - Redirect URLs: your production domain

2. **Deploy Frontend**:
   - Vercel (recommended): automatic React deployment
   - Add environment variables in Vercel dashboard

3. **Security**:
   - Review RLS policies
   - Set up proper email templates in Supabase
   - Enable 2FA for admin accounts

We'll cover this in detail when you're ready!
