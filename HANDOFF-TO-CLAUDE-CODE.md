# 🤝 HANDOFF TO CLAUDE CODE

**Project**: Baseball Team Management App
**Current Status**: Phases 1, 2, & 3 Complete
**Last Updated**: December 2024

---

## What This Document Is

This is a comprehensive handoff for continuing development in Claude Code. It contains:
- Current state of the project
- What's been built and tested
- What's next to build
- Important design decisions to maintain
- Common patterns to follow

---

## 📊 Project Status at Handoff

### ✅ Completed & Working

**Phase 1: Foundation**
- [x] Authentication (login, password change, logout)
- [x] User management with Edge Function (no more manual Supabase steps!)
- [x] Role-based access (Super Admin, Admin, Coach)
- [x] Database schema with fixed RLS policies

**Phase 2: Data Management**
- [x] Season CRUD (create, edit, delete, set active)
- [x] Team CRUD (by division: Training, Minor, Major)
- [x] Player CRUD (individual + bulk CSV import)
- [x] Coach management (view coaches and assignments)
- [x] Coach assignments (assign to teams, always read-only)

**Phase 3: Game Entry (Complete)**
- [x] Two-step game entry form
- [x] Basic game info (date, teams, scores, scorekeeper)
- [x] Player data entry (attendance, innings, pitch counts)
- [x] Game viewing with full details
- [x] Game editing
- [x] Game deletion

---

## 🎯 Next Tasks (Phase 4 - Rules Engine)

**Phase 3 is now complete!** All game management features are working.

**Focus for Phase 4**:

1. **Rest Day Calculator**
   - Query pitch_count_rules table
   - Match player age to rule range
   - Calculate days required based on final_pitch_count
   - Display "Available to pitch on [date]"

2. **Rule Validation During Entry**
   - Check if player pitched within rest days
   - Check if player caught 4+ innings (can't pitch same game)
   - Show warnings in UI before allowing save

3. **Violation Flags**
   - Add `violations` JSONB column to games table
   - Store rule violations detected
   - Display warnings on game detail view

---

## 🔑 Critical Design Decisions (DO NOT CHANGE)

### 1. User Roles
- Super Admin, Admin, Coach only
- **Scorekeepers are NOT users** (just text field)
- Coaches are **always read-only** (can_edit = false)

### 2. Database Constraints
- Jersey numbers unique per team (enforced by DB)
- Only one active season (unique partial index)
- Age range 7-12 (CHECK constraint)
- Home team ≠ Away team (CHECK constraint)

### 3. RLS Policy Pattern
- user_profiles has **NO RLS** (avoids recursion)
- Use helper functions: `is_admin()`, `is_super_admin()`
- Never query user_profiles directly in policies

### 4. Tailwind Version
- **Must use v3.4.1** (v4 causes PostCSS errors)
- Don't upgrade Tailwind without testing

### 5. Edge Function
- URL: `https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/create-user`
- Used for creating users from app
- Already deployed and working

---

## 📁 Code Organization Patterns

### Component Structure
```javascript
// Main component
export default function FeatureManagement() {
  // State
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Effects
  useEffect(() => { fetchItems() }, [])
  
  // Handlers
  const handleCreate = async () => { ... }
  const handleUpdate = async () => { ... }
  const handleDelete = async () => { ... }
  
  // Render
  return ( ... )
}

// Modal component (inline, not separate file)
function ItemModal({ item, onClose, onSuccess, onError }) {
  const [formData, setFormData] = useState({ ... })
  const [modalError, setModalError] = useState(null)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setModalError(null)
    
    try {
      // Create or update
      if (item) {
        // Update
      } else {
        // Create
      }
      onSuccess()
    } catch (err) {
      setModalError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 ...">
      {modalError && <div className="alert alert-error">{modalError}</div>}
      <form onSubmit={handleSubmit}>...</form>
    </div>
  )
}
```

### Error Handling Pattern
```javascript
try {
  const { error } = await supabase.from('table').operation()
  
  if (error) {
    // Map database error codes to user-friendly messages
    if (error.code === '23505') {
      throw new Error('Already exists')
    }
    if (error.code === '23503') {
      throw new Error('Cannot delete: related records exist')
    }
    throw error
  }
  
  // Success
  onSuccess()
} catch (err) {
  setModalError(err.message)  // Show in modal
}
```

### Modal Error Display
```javascript
// ALWAYS show errors inside the modal, not behind it
{modalError && (
  <div className="alert alert-error mb-4">
    {modalError}
  </div>
)}
```

---

## 🗂️ File Locations Quick Reference

```
src/components/
├── auth/
│   ├── Login.jsx              - Login form
│   └── ChangePassword.jsx     - Password change
│
├── admin/
│   └── UserManagement.jsx     - User CRUD (uses Edge Function)
│
├── layout/
│   └── Dashboard.jsx          - Main layout + navigation
│
├── seasons/
│   └── SeasonManagement.jsx   - Season CRUD
│
├── teams/
│   └── TeamManagement.jsx     - Team CRUD + coach assignments
│
├── players/
│   └── PlayerManagement.jsx   - Player CRUD + CSV import
│
├── coaches/
│   └── CoachManagement.jsx    - View coaches
│
└── games/
    └── GameEntry.jsx          - Two-step game entry
                                 TODO: Add view/edit/delete here
```

---

## 🔍 Where Things Are

### Supabase Configuration
- **File**: `src/lib/supabase.js`
- **Env vars**: `.env.local` (not in repo)
- **Keys**: Project URL + anon key

### Database Schema
- **File**: `database/schema.sql`
- **Location**: Supabase SQL Editor (already executed)
- **Important**: Has comments explaining each section

### Styling
- **File**: `src/index.css`
- **Classes**: Custom Tailwind utilities (btn, input, card, alert)
- **Pattern**: Use existing classes for consistency

### Navigation
- **File**: `src/components/layout/Dashboard.jsx`
- **Method**: State-based (currentView state)
- **To Add Route**: Add button in sidebar + case in main content

---

## 🧪 Testing Checklist

### Before Committing New Features

- [ ] Test create operation
- [ ] Test edit operation (if applicable)
- [ ] Test delete operation (if applicable)
- [ ] Test validation errors
- [ ] Test foreign key constraints
- [ ] Test with empty lists
- [ ] Test duplicate entries (where applicable)
- [ ] Check error messages show in modal (not behind)
- [ ] Check success messages auto-dismiss
- [ ] Check data refreshes after save

---

## 🐛 Known Issues & Workarounds

### Issue 1: Tailwind v4 PostCSS Error
**Symptom**: PostCSS plugin error on `npm run dev`  
**Solution**: Ensure `package.json` has `"tailwindcss": "^3.4.1"`

### Issue 2: Blank Screen After Login
**Symptom**: Login succeeds but shows blank page  
**Solution**: Check `App.jsx` has null check: `{profile ? <Dashboard /> : null}`

### Issue 3: Modal Errors Hidden
**Symptom**: Error appears behind modal  
**Solution**: Use `modalError` state inside modal component, not parent

### Issue 4: RLS Infinite Recursion
**Symptom**: Database queries fail with "infinite recursion"  
**Solution**: User_profiles must have NO RLS, use helper functions in policies

---

## 💡 Development Tips

### Adding a New Feature

1. **Database first** (if schema changes needed)
   ```sql
   -- Add to database/schema.sql
   -- Test in Supabase SQL Editor
   -- Commit schema change
   ```

2. **Component second**
   ```javascript
   // Create component in appropriate folder
   // Follow existing patterns
   // Add to Dashboard
   ```

3. **Test thoroughly**
   ```
   - Happy path
   - Error cases
   - Edge cases
   - Constraints
   ```

### Common Supabase Patterns

```javascript
// Fetch with join
const { data, error } = await supabase
  .from('table')
  .select(`
    *,
    related_table (column1, column2)
  `)
  .eq('filter', value)

// Insert
const { error } = await supabase
  .from('table')
  .insert([{ field: value }])

// Update
const { error } = await supabase
  .from('table')
  .update({ field: value })
  .eq('id', id)

// Delete
const { error } = await supabase
  .from('table')
  .delete()
  .eq('id', id)
```

---

## 📚 Documentation Files

Read these for context:

1. **README.md** - Project overview, features, setup
2. **ARCHITECTURE.md** - System design, data flow, security
3. **PROJECT_SUMMARY.md** - What's built, design changes, status
4. **QUICKSTART.md** - Fast setup guide (15 min)

---

## 🎨 UI/UX Standards

### Colors
- Primary: Blue (btn-primary, text-blue-600)
- Success: Green (bg-green-100, text-green-800)
- Error: Red (alert-error, text-red-600)
- Warning: Yellow (bg-yellow-50, text-yellow-800)

### Components
- Buttons: `.btn` base + `.btn-primary` or `.btn-secondary`
- Inputs: `.input` class
- Labels: `.label` class
- Cards: `.card` class
- Alerts: `.alert` + `.alert-error/success/warning`

### Spacing
- Use Tailwind spacing scale (mb-4, p-6, gap-2, etc.)
- Consistent padding: cards (p-6), modals (p-6)

---

## 🔐 Security Reminders

1. **Never expose service role key in client**
   - Only in Edge Functions
   - Never in .env.local
   
2. **Always validate on backend**
   - Database constraints are first line of defense
   - RLS policies enforce access control
   
3. **Check user roles**
   - UI hides features based on role
   - But RLS policies actually enforce it

---

## 🚀 Deployment Notes (Future)

When ready to deploy:

1. **Vercel Setup**
   - Connect GitHub repo
   - Add environment variables
   - Auto-deploys on push to main

2. **Supabase Config**
   - Update auth redirect URLs
   - Set site URL to production domain

3. **Edge Function**
   - Already deployed in Supabase
   - No changes needed

---

## 📝 Git Workflow

### Commit Messages
```bash
# Good examples
git commit -m "Add game detail view modal"
git commit -m "Fix error display in player modal"
git commit -m "Add delete game functionality"

# Bad examples  
git commit -m "updates"
git commit -m "fix"
git commit -m "WIP"
```

### Branch Strategy
- `main` - working code only
- Feature branches optional for major changes

---

## 🎯 Success Criteria for Phase 3

Phase 3 is complete! ✅
- [x] Games can be entered (Step 1 and 2)
- [x] Games can be viewed with all details
- [x] Games can be edited
- [x] Games can be deleted
- [x] No bugs in game entry workflow

**Ready for Phase 4!**

---

## 🤔 Decision Log

Key decisions made during development:

| Decision | Reason | Impact |
|----------|--------|--------|
| Scorekeepers not users | Don't need login access | Removed from user roles |
| Coaches read-only | Admins control data | can_edit always false |
| No RLS on user_profiles | Avoid recursion | Use helper functions |
| Tailwind v3 only | v4 has PostCSS issues | Lock to 3.4.1 |
| Edge Function for users | Secure user creation | Better UX |
| CSV bulk import | Faster roster entry | Time saver |
| Two-step game entry | Better UX for complex form | Clearer workflow |

---

## ✅ Pre-Development Checklist

Before starting new work:

- [ ] Pull latest changes
- [ ] Read this handoff document
- [ ] Review related documentation files
- [ ] Check current database schema
- [ ] Verify environment is working (`npm run dev`)
- [ ] Understand existing patterns
- [ ] Plan approach before coding

---

## 🆘 If Something Breaks

1. **Check browser console** (F12)
2. **Check terminal** (Vite dev server)
3. **Check Supabase logs** (Dashboard → Logs)
4. **Check database constraints** (might need to fix in schema)
5. **Refer to error handling patterns** (above)

---

## 📞 Context for AI Continuation

**You are continuing work on a baseball team management app.**

**Current state:**
- ✅ Phase 1: Foundation complete (auth, users, database)
- ✅ Phase 2: Data management complete (seasons, teams, players, coaches)
- ✅ Phase 3: Game management complete (entry, view, edit, delete)

**Your immediate goal:**
- Begin Phase 4 (rules validation engine)
- Follow existing patterns
- Maintain design decisions
- Test thoroughly

**Key patterns to follow:**
- Two-file imports (e.g., relative paths like `../../lib/supabase`)
- Modal components inline (not separate files)
- Error display inside modals
- Fetch fresh data after mutations
- Success messages auto-dismiss after 3 seconds

**Important constraints:**
- Don't change user roles design
- Don't change RLS approach
- Don't upgrade Tailwind
- Don't modify Edge Function
- Follow existing component patterns

**Start by:**
1. Reading this document fully
2. Understanding the rules in RULES.md
3. Examining the pitch_count_rules table structure
4. Planning the rules validation approach
5. Building incrementally and testing thoroughly

---

**Good luck! Phases 1-3 are complete - ready for Phase 4! 🚀**
