# Delete User Account — Design

**Date:** 2026-07-22
**Branch:** `feature/92-allow-deletion-of-user`
**Status:** Approved for planning

## Summary

Allow a super admin to permanently **hard delete** a user account from the app.
Deletion removes the auth account, the user profile, and all of that user's coach
assignments in a single cascade. This is distinct from the existing **Deactivate**
action (a reversible soft-disable) and cannot be undone.

## Goals

- Super admins can permanently delete `coach` and `admin` user accounts.
- Deletion cleans up all related records (profile + coach assignments) automatically.
- Guardrails prevent removing critical accounts.

## Non-Goals

- No soft-delete / archive (Deactivate already covers reversible disabling).
- No bulk deletion — one user at a time.
- No "undo" or restore flow.

## Access Rules

| Rule | Enforcement |
| --- | --- |
| Only `super_admin` may delete a user | Edge function verifies caller role; server-side |
| `super_admin` accounts can **never** be deleted through the app | UI hides the action for super_admin rows; edge function also refuses |
| A super admin cannot delete themselves | Impossible by construction — super_admins are not deletable |
| Cannot delete the last super admin | Impossible by construction — super_admins are not deletable |

Deletable roles: **`coach` and `admin` only.**

## Architecture

Three pieces, following the existing user-management patterns
(`create-user`, `reset-password`).

### 1. `delete-user` Edge Function (new)

Mirrors the existing `create-user` / `reset-password` Supabase Edge Functions.

Responsibilities:
1. Read the caller's session from the `Authorization: Bearer <token>` header.
2. Verify the caller is an **active `super_admin`** — reject with 403 otherwise.
3. Look up the target user's profile by `userId`.
4. **Refuse if the target's role is `super_admin`** (defense-in-depth; the UI already
   hides the action, but the function enforces it independently).
5. Use the service-role key to call `auth.admin.deleteUser(userId)`.
6. Return `{ success: true }` or `{ error: <message> }` with an appropriate status.

Cascade behavior (already in schema, no changes needed):
- `user_profiles.id` → `auth.users(id) ON DELETE CASCADE`
- `team_coaches.user_id` → `user_profiles(id) ON DELETE CASCADE`

Deleting the `auth.users` row therefore removes the profile and all coach
assignments automatically.

**Deployment note:** Edge function source is not checked into this repo; the existing
functions are deployed directly to Supabase. The `delete-user` function source will be
provided in the implementation, but it must be **deployed to Supabase** (dashboard or
CLI) for the feature to work end-to-end.

### 2. `DeleteUserModal.jsx` (new — `src/components/admin/`)

- Follows the established **type `DELETE` to confirm** pattern from
  `PlayerDeleteConfirmationModal.jsx`.
- Uses `useBodyScrollLock()`.
- Displays the target user's **name, email, and role**.
- Warns that the action is **permanent** and that the user's **coach assignments will
  be removed**.
- On confirm, calls the `delete-user` edge function using the session bearer token
  (same `fetch` pattern as `ResetPasswordModal`).
- Reports success/error back to `UserManagement` via callbacks.

### 3. `UserManagement.jsx` (modified)

- Add a red **Delete** inline text link in the Actions column, styled consistently with
  the existing `Deactivate` / `Reset Password` links.
- **Render the Delete link only for `coach` and `admin` rows** — never for
  `super_admin`.
- Wire up modal open/close state (`deleteUser`, similar to `resetPasswordUser`).
- On success: close modal, `fetchUsers()`, show the success banner
  (`User deleted successfully`), auto-clear after 3s.
- On error: show the error banner.
- Update the "How to Manage Users" instructions box to mention Delete and how it
  differs from Deactivate.

## Data Integrity Notes

- `app_config.updated_by` → `auth.users(id)` has no `ON DELETE` rule (defaults to
  `NO ACTION`), which could in theory block a delete. **However**, only super admins can
  update `app_config`, and super admins are never deletable through the app — so this
  FK can never reference a deletable user, and the conflict cannot occur. **No schema
  migration needed.**
- Scorekeepers are stored as plain text in the `games` table, not as user accounts, so
  deleting a user never affects game history.

## Testing

- Business logic is thin (mostly a guarded edge-function call), but add/verify:
  - `UserManagement` renders the Delete link only for `coach`/`admin` rows and not for
    `super_admin` rows.
  - `DeleteUserModal` enables the confirm button only when `DELETE` is typed, and
    invokes `onConfirm` on submit.
- Manual/integration verification of the edge function (auth checks, super_admin
  refusal, successful cascade) after deployment.

## Files

**New**
- `delete-user` edge function source (deployed to Supabase)
- `src/components/admin/DeleteUserModal.jsx`

**Modified**
- `src/components/admin/UserManagement.jsx`

**Docs**
- Update `CLAUDE.md` (User Management section) and any relevant docs to describe the
  delete flow.
