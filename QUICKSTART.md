# 🚀 QUICK START - Baseball Team Manager

## What You Have

Complete Phase 1 of the Baseball Team Management App:
- ✅ Database schema (Pitch Smart rules included)
- ✅ Authentication system  
- ✅ User management (Super Admin can add users)
- ✅ Role-based access control
- ✅ Password change enforcement
- ✅ Responsive UI with Tailwind CSS

## Next Steps

### 1. Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project (takes ~2 min to provision)
3. Go to SQL Editor → New Query
4. Copy/paste entire `database/schema.sql` file
5. Click **Run**
6. Go to Settings → API and copy:
   - Project URL
   - anon/public key

### 2. Set Up the App (2 minutes)

```bash
cd baseball-app
npm install
```

Create `.env.local` file:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. Create First Super Admin (3 minutes)

**In Supabase Dashboard:**
1. Authentication → Users → Add user
   - Email: your@email.com
   - Password: TempPass123
   - ✓ Auto Confirm User
   - Copy the UUID!

2. Table Editor → user_profiles → Insert row
   - id: [paste UUID]
   - email: your@email.com
   - name: Your Name
   - role: super_admin
   - is_active: true
   - must_change_password: false

### 4. Run the App

```bash
npm run dev
```

Open http://localhost:5173

Login with your email/password → You're in! 🎉

## What's Next?

You can now:
- ✅ Add more users (User Management tab)
- ⏭️ Build Phase 2 (Seasons, Teams, Players)

See `SETUP.md` for detailed instructions and troubleshooting.
See `README.md` for full documentation.

## File Structure

```
baseball-app/
├── database/schema.sql       ← Run this in Supabase
├── src/
│   ├── components/           ← React components
│   ├── lib/supabase.js      ← API config
│   └── App.jsx              ← Main app
├── .env.example             ← Template for your .env.local
├── package.json
├── SETUP.md                 ← Detailed setup guide
└── README.md                ← Full documentation
```

## Need Help?

1. Can't log in? → Check user exists in both `auth.users` AND `user_profiles`
2. API errors? → Verify `.env.local` has correct credentials
3. Database errors? → Confirm you ran entire `schema.sql`

---

**Ready to continue?** Once Phase 1 is working, let me know and we'll build Phase 2 (Seasons, Teams & Players)!
