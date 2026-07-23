# Delete User Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a super admin permanently hard-delete `coach` and `admin` user accounts from the app.

**Architecture:** A new `delete-user` Supabase Edge Function (service-role) performs the hard delete after verifying the caller is an active super admin and that the target is not a super admin; deleting the `auth.users` row cascades to `user_profiles` and `team_coaches`. The frontend adds a pure "type DELETE to confirm" modal and a red Delete link in the user table, with the edge-function `fetch` living in `UserManagement`.

**Tech Stack:** React 19 + Vite, Supabase (Edge Functions on Deno, Auth, Postgres RLS), Vitest 4 + React Testing Library, Tailwind 3.

## Global Constraints

- Deletable roles are **`coach` and `admin` only**. `super_admin` accounts must never be deletable through the app (enforced in UI *and* edge function).
- Only an active `super_admin` may invoke the delete (enforced server-side in the edge function).
- Edge function URL base: `https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/`.
- Frontend calls edge functions with `Authorization: Bearer <session.access_token>` via `fetch` (see `AddUserModal.jsx` / `ResetPasswordModal.jsx`).
- No database schema migration is required (the `app_config.updated_by` FK can never reference a deletable user).
- Tailwind v3 only. ES modules. Match existing component style (inline text-link actions).
- Run tests with `npm run test:run`. Commit frequently.

---

## File Structure

**New**
- `supabase/functions/delete-user/index.ts` — Edge Function source (version-controlled; deployed manually to Supabase).
- `src/components/admin/DeleteUserModal.jsx` — pure confirmation dialog.
- `src/__tests__/components/admin/DeleteUserModal.test.jsx` — modal tests.
- `src/__tests__/components/admin/UserManagement.test.jsx` — Delete-link visibility tests.

**Modified**
- `src/components/admin/UserManagement.jsx` — Delete link + `handleDeleteUser` + modal wiring + instructions copy.

---

### Task 1: `delete-user` Edge Function source

**Files:**
- Create: `supabase/functions/delete-user/index.ts`

**Interfaces:**
- Consumes: nothing (entry point). Expects POST JSON body `{ userId: string }` and header `Authorization: Bearer <access_token>`.
- Produces: HTTP responses — `200 { success: true }` on success; `4xx/5xx { error: string }` otherwise. Consumed by `UserManagement.handleDeleteUser` (Task 3).

- [ ] **Step 1: Write the edge function**

Create `supabase/functions/delete-user/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client scoped to the caller's JWT — identifies who is calling.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    // Service-role client — bypasses RLS for profile checks + deletion.
    const admin = createClient(supabaseUrl, serviceKey)

    // Caller must be an ACTIVE super_admin.
    const { data: callerProfile, error: callerProfileErr } = await admin
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', caller.id)
      .single()
    if (
      callerProfileErr ||
      !callerProfile ||
      callerProfile.role !== 'super_admin' ||
      !callerProfile.is_active
    ) {
      return json({ error: 'Only super admins can delete users' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const userId = body?.userId
    if (!userId || typeof userId !== 'string') {
      return json({ error: 'userId is required' }, 400)
    }

    if (userId === caller.id) {
      return json({ error: 'You cannot delete your own account' }, 400)
    }

    // Target must exist and must NOT be a super admin.
    const { data: target, error: targetErr } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (targetErr || !target) {
      return json({ error: 'User not found' }, 404)
    }
    if (target.role === 'super_admin') {
      return json({ error: 'Super admin accounts cannot be deleted' }, 403)
    }

    // Hard delete auth user — cascades to user_profiles and team_coaches.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) {
      return json({ error: delErr.message }, 500)
    }

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/delete-user/index.ts
git commit -m "feat: add delete-user edge function source"
```

- [ ] **Step 3: Deploy note (manual — cannot be automated here)**

The edge function must be deployed to Supabase for the feature to work end-to-end:
```bash
supabase functions deploy delete-user
```
The reviewer/owner deploys this (dashboard or CLI). No app code depends on deployment to pass its unit tests.

---

### Task 2: `DeleteUserModal` confirmation dialog

**Files:**
- Create: `src/components/admin/DeleteUserModal.jsx`
- Test: `src/__tests__/components/admin/DeleteUserModal.test.jsx`

**Interfaces:**
- Consumes: `useBodyScrollLock` from `../../lib/useBodyScrollLock`.
- Produces: default export `DeleteUserModal`, props `{ userName: string, userEmail: string, userRole: string, loading: boolean, onConfirm: () => void, onClose: () => void }`. Consumed by `UserManagement` (Task 3).

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/admin/DeleteUserModal.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteUserModal from '../../../components/admin/DeleteUserModal'

const baseProps = {
  userName: 'Jane Coach',
  userEmail: 'jane@example.com',
  userRole: 'coach',
  loading: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe('DeleteUserModal', () => {
  it('shows the target user details', () => {
    render(<DeleteUserModal {...baseProps} />)
    expect(screen.getByText('Jane Coach')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('disables confirm until DELETE is typed, then calls onConfirm', () => {
    const onConfirm = vi.fn()
    render(<DeleteUserModal {...baseProps} onConfirm={onConfirm} />)

    const confirmBtn = screen.getByRole('button', { name: /delete user/i })
    expect(confirmBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    })
    expect(confirmBtn).not.toBeDisabled()

    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not call onConfirm when confirmation text is wrong', () => {
    const onConfirm = vi.fn()
    render(<DeleteUserModal {...baseProps} onConfirm={onConfirm} />)
    fireEvent.change(screen.getByPlaceholderText('Type DELETE to confirm'), {
      target: { value: 'delete' },
    })
    fireEvent.click(screen.getByRole('button', { name: /delete user/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/admin/DeleteUserModal.test.jsx`
Expected: FAIL — cannot resolve module `DeleteUserModal` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/DeleteUserModal.jsx`:

```jsx
import { useState } from 'react'
import { useBodyScrollLock } from '../../lib/useBodyScrollLock'

export default function DeleteUserModal({
  userName,
  userEmail,
  userRole,
  loading,
  onConfirm,
  onClose,
}) {
  useBodyScrollLock()
  const [confirmText, setConfirmText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (confirmText === 'DELETE') {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4 text-red-600">Delete User</h3>

        <p className="mb-4">
          Are you sure you want to permanently delete <strong>{userName}</strong>?
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-700">
          <p><strong>Email:</strong> {userEmail}</p>
          <p><strong>Role:</strong> {userRole.replace('_', ' ')}</p>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          This will permanently remove the user's account and all of their coach
          assignments. This action cannot be undone. Type <strong>DELETE</strong> to
          confirm.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            className="input w-full"
            placeholder="Type DELETE to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 bg-red-600 hover:bg-red-700"
              disabled={confirmText !== 'DELETE' || loading}
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/admin/DeleteUserModal.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/DeleteUserModal.jsx src/__tests__/components/admin/DeleteUserModal.test.jsx
git commit -m "feat: add DeleteUserModal confirmation dialog"
```

---

### Task 3: Wire Delete into `UserManagement`

**Files:**
- Modify: `src/components/admin/UserManagement.jsx`
- Test: `src/__tests__/components/admin/UserManagement.test.jsx`

**Interfaces:**
- Consumes: `DeleteUserModal` (Task 2); `delete-user` edge function (Task 1); `supabase` from `../../lib/supabase`.
- Produces: `handleDeleteUser(user)` internal handler; Delete link rendered only for non-`super_admin` rows.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/admin/UserManagement.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { supabase } from '../../../lib/supabase'
import UserManagement from '../../../components/admin/UserManagement'

const USERS = [
  { id: '1', name: 'Coach One', email: 'c1@x.com', role: 'coach', is_active: true },
  { id: '2', name: 'Admin One', email: 'a1@x.com', role: 'admin', is_active: true },
  { id: '3', name: 'Super One', email: 's1@x.com', role: 'super_admin', is_active: true },
]

beforeEach(() => {
  // fetchUsers(): supabase.from('user_profiles').select('*').order(...)
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: USERS, error: null }),
    }),
  })
})

describe('UserManagement — delete link visibility', () => {
  it('renders a Delete link for coach and admin rows but not super_admin', async () => {
    render(<UserManagement />)
    await waitFor(() => expect(screen.getByText('Coach One')).toBeInTheDocument())

    const deleteLinks = screen.getAllByRole('button', { name: 'Delete' })
    expect(deleteLinks).toHaveLength(2)
  })

  it('opens the confirmation modal when Delete is clicked', async () => {
    render(<UserManagement />)
    await waitFor(() => expect(screen.getByText('Coach One')).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(
      screen.getByRole('button', { name: /delete user/i })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/components/admin/UserManagement.test.jsx`
Expected: FAIL — no button named "Delete" exists yet (`getAllByRole` throws / length 0).

- [ ] **Step 3: Add delete state, import, and handler**

In `src/components/admin/UserManagement.jsx`, add the import near the other modal imports (after the `ResetPasswordModal` import on line 4):

```jsx
import DeleteUserModal from './DeleteUserModal'
```

Add state next to `resetPasswordUser` (after line 13, `const [resetPasswordUser, setResetPasswordUser] = useState(null)`):

```jsx
  const [deleteUser, setDeleteUser] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
```

Add the handler after `handleResetPassword` (after line 68):

```jsx
  const handleDeleteUser = async () => {
    if (!deleteUser) return
    setDeleteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(
        'https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/delete-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId: deleteUser.id })
        }
      )

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      const deletedName = deleteUser.name
      setDeleteUser(null)
      fetchUsers()
      setSuccess(`User ${deletedName} deleted successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 5000)
    } finally {
      setDeleteLoading(false)
    }
  }
```

- [ ] **Step 4: Add the Delete link in the Actions cell**

In the Actions `<div className="flex gap-3">` (after the Reset Password button, around line 194), add:

```jsx
                      {user.role !== 'super_admin' && (
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="text-sm text-red-600 hover:text-red-800"
                          title="Permanently delete this user"
                        >
                          Delete
                        </button>
                      )}
```

- [ ] **Step 5: Render the modal**

After the `resetPasswordUser && (...)` block (before the final closing `</div>`, around line 233), add:

```jsx
      {deleteUser && (
        <DeleteUserModal
          userName={deleteUser.name}
          userEmail={deleteUser.email}
          userRole={deleteUser.role}
          loading={deleteLoading}
          onConfirm={handleDeleteUser}
          onClose={() => setDeleteUser(null)}
        />
      )}
```

- [ ] **Step 6: Update the instructions copy**

In the "How to Manage Users" box, add a `<p>` after the Reset Password line (around line 113):

```jsx
          <p><strong>Delete:</strong> Click "Delete" to permanently remove a coach or admin account and all of their coach assignments. This cannot be undone. Super admin accounts cannot be deleted here — deactivate them instead.</p>
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/__tests__/components/admin/UserManagement.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Run the full suite to check for regressions**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/UserManagement.jsx src/__tests__/components/admin/UserManagement.test.jsx
git commit -m "feat: add delete user action to User Management"
```

---

### Task 4: Documentation

**Files:**
- Modify: `CLAUDE.md` (User Management section)

**Interfaces:** none.

- [ ] **Step 1: Update CLAUDE.md**

In the "User Management via Edge Function" section of `CLAUDE.md`, add a note documenting the new function after the existing edge-function description:

```markdown
**Deleting users**: The `delete-user` edge function (service role) permanently removes a
user. It verifies the caller is an active super_admin and refuses to delete `super_admin`
accounts. Deleting the `auth.users` row cascades to `user_profiles` and `team_coaches`.
Only `coach` and `admin` accounts are deletable through the app; super admins must be
deactivated instead.

**Edge Function URL**: `https://dnvitfjnlojorcqqccec.supabase.co/functions/v1/delete-user`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document delete-user edge function and delete flow"
```

---

## Self-Review Notes

- **Spec coverage:** Edge function (Task 1), pure confirmation modal (Task 2), UserManagement Delete link restricted to coach/admin + `handleDeleteUser` + instructions copy (Task 3), docs (Task 4). All spec sections covered.
- **Server-side guards:** caller-is-active-super_admin, target-not-super_admin, no-self-delete, and userId-required all enforced in Task 1.
- **Cascade:** relies on existing `ON DELETE CASCADE` FKs; no migration (per spec).
- **Type consistency:** `DeleteUserModal` prop names (`userName`, `userEmail`, `userRole`, `loading`, `onConfirm`, `onClose`) match the render site in Task 3; `handleDeleteUser` posts `{ userId }`, matching the edge function's expected body in Task 1.
