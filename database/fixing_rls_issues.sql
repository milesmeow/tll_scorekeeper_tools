-- FIXING RLS ISSUES ---
-- (1), drop the helper function causing recursion
DROP FUNCTION IF EXISTS public.get_user_role(UUID);

-- Drop all existing user_profiles policies
DROP POLICY IF EXISTS "Super admins can manage all users" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create simple, non-recursive policies
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

-- Allow users to update their own profile (for password changes, etc.)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Super admins can do everything (we'll add this role to user metadata)
CREATE POLICY "Super admins full access"
  ON public.user_profiles FOR ALL
  USING (
    (SELECT raw_user_meta_data->>'is_super_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
  );



--- (2) mark my user as super user
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"is_super_admin": "true"}'::jsonb
WHERE id = '09b9b8d1-da68-4dde-a494-66c253c49302';