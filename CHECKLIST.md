# ✅ Setup Checklist

Use this to track your setup progress:

## Supabase Setup
- [ ] Created Supabase account
- [ ] Created new project
- [ ] Ran `database/schema.sql` in SQL Editor
- [ ] Copied Project URL
- [ ] Copied anon/public key

## Local Setup  
- [ ] Installed Node.js 18+
- [ ] Ran `npm install` in baseball-app folder
- [ ] Created `.env.local` file with credentials
- [ ] Verified `.env.local` has both URL and key

## First User
- [ ] Created auth user in Supabase Dashboard
- [ ] Copied user UUID
- [ ] Created user_profiles entry with UUID
- [ ] Set role to `super_admin`
- [ ] Set is_active to `true`

## Testing
- [ ] Ran `npm run dev`
- [ ] App opened at http://localhost:5173
- [ ] Logged in successfully
- [ ] Can see Dashboard
- [ ] Can access User Management (for super admins)

## Ready for Phase 2?
- [ ] Phase 1 working perfectly
- [ ] Ready to build Seasons, Teams & Players

---

**Stuck?** Check:
1. Browser console for errors (F12)
2. Terminal for error messages  
3. SETUP.md for troubleshooting
4. Supabase Dashboard → Logs for database errors

**Common Issues:**
- "Invalid API key" → Check `.env.local` copied correctly
- "User not found" → Verify user exists in BOTH auth.users AND user_profiles
- "Permission denied" → Verify RLS policies by running full schema.sql
