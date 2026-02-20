# Plan: Fix "Failed to Fetch" Login Error

## Problem Analysis

"Failed to Fetch" is a **browser-level network error** from the native Fetch API.
It is propagated through the Supabase JS client when it cannot reach the Supabase API.
It is NOT an authentication error — it means the HTTP request never completed.

The error surfaces in `Login.jsx:55`:
```javascript
} catch (err) {
  setError(err.message)  // Shows raw "Failed to fetch" browser message
}
```

## Root Causes (in order of likelihood)

1. **Supabase project is paused** — Free-tier Supabase projects auto-pause after ~7 days of inactivity. The URL and key are valid, but the server returns nothing.
2. **Wrong `VITE_SUPABASE_URL`** — The env var is set (app loads) but points to a wrong/nonexistent project URL.
3. **CORS misconfiguration** — The Supabase project's allowed origins don't include the app's current domain.
4. **Client-side network issue** — User has no internet or a firewall is blocking requests to `*.supabase.co`.

Note: If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` were entirely missing, the app would throw `'Missing Supabase environment variables'` at startup and never reach the login screen. So the env vars ARE set.

## Fix

### Step 1: Improve the error message in `Login.jsx`

The raw "Failed to fetch" message is unhelpful to users. Detect network errors and
replace with an actionable message.

**File**: `src/components/auth/Login.jsx`
**Change**: In the `catch` block, check if the error is a network/fetch error and
show a user-friendly message instead.

```javascript
} catch (err) {
  const isNetworkError =
    err.message === 'Failed to fetch' ||
    (err instanceof TypeError && err.message.includes('fetch'))

  if (isNetworkError) {
    setError('Unable to connect to the server. Please check your internet connection and try again, or contact an administrator if the problem persists.')
  } else {
    setError(err.message)
  }
  setLoading(false)
}
```

### Step 2: Commit and push to feature branch

Commit with a clear message explaining the fix.

## Out of Scope

- Fixing the actual Supabase project connectivity (env vars / project status) — this is an
  infrastructure issue, not a code bug. The admin should verify:
  - The Supabase project is not paused (check Supabase dashboard)
  - `VITE_SUPABASE_URL` matches the project URL exactly
  - The app's domain is listed in Supabase Auth → URL Configuration → Allowed origins
