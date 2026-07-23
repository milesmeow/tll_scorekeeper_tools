# Bulk Add Users — Design

**Date:** 2026-07-23
**Branch:** feature/90-bulk-add-users

## Problem

The User Management tab (`super_admin` only) supports adding users one at a time via
`AddUserModal`. Super admins need to onboard many coaches at once from a CSV list,
mirroring the existing "Bulk Add Players" flow for teams.

## Input / Output

- **Input CSV:** `Full Name, email` (one user per line). Every user is created with the
  `coach` role (locked — no role column).
- **Output CSV:** `Full Name,email,temp password` (header row included), delivered on
  screen with Copy and Download buttons.

## Key architectural difference from Bulk Add Players

Bulk Add Players is a single atomic `supabase.from('players').insert([...])` — all-or-nothing.

Bulk Add Users cannot be atomic: creating a user requires the `create-user` **edge
function** (service role, touches `auth.users`), called **one user per request**. So the
batch is a sequential loop of N API calls, and rows can partially fail (e.g. row 4 is a
duplicate email while rows 1–3 already succeeded).

**Decision:** Continue on error, report per row. Successfully-created users keep their
accounts; failures are listed with reasons at the end.

## New files

- `src/lib/userCsvUtils.js`
  - `parseUserCsv(csvData)` → `[{ name, email }]`; throws on parse/validation errors with
    line numbers. Validates: name required, valid email, no duplicate emails within the
    paste. Skips blank lines. Rejects empty result.
  - `generateTempPassword()` → 12-char password from the unambiguous charset used in
    `AddUserModal` (extracted so both share one source of truth).
  - `usersToResultCsv(rows)` → CSV string `Full Name,email,temp password` with header.
- `src/components/admin/BulkAddUsersModal.jsx` — three states: **input**, **processing**
  (progress "Creating X of N…"), **results** (successes table + failures list).
- `src/__tests__/lib/userCsvUtils.test.js` — unit tests for the util (TDD).

## Modified files

- `src/components/admin/UserManagement.jsx` — add "⬆ Bulk Add" button beside "+ Add User",
  `showBulkAddModal` state, render the modal, refresh user list on completion.
- `src/components/admin/AddUserModal.jsx` — reuse `generateTempPassword()` from the new util
  (remove local duplicate).

## Flow

1. **Input** — paste CSV, "Import Users" button.
2. **Processing** — `parseUserCsv` first (local; nothing created on parse error). Then loop
   rows sequentially, calling `create-user` with an auto-generated temp password and
   `role: 'coach'`. Show progress.
3. **Results** — successes table (name · email · temp password) with Copy CSV / Download
   .csv; failures list (row #, email, reason) in red if any.

## Validation & errors

- Local parse errors → shown on input screen, nothing created.
- Duplicate emails within the paste → rejected up front.
- Duplicate emails that already exist server-side → per-row failure in results.
- Per-row API failures never abort the batch.

## Security notes

- Only `super_admin` can reach this UI (matches existing gating) and the edge function
  enforces the same server-side.
- Temp passwords exist only in the returned CSV — not persisted anywhere else. Users must
  change password on first login (same as single-add).

## Out of scope

- Roles other than coach (promote later via existing Change Role).
- File upload (paste only, matching Bulk Add Players).
- Parallel/concurrent creation (sequential is sufficient for coach rosters).
