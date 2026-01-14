-- =====================================================
-- MIGRATION: Add app_config table for maintenance mode
-- Date: 2026-01-13
-- Purpose: Enable maintenance mode toggle for administrators
-- =====================================================

BEGIN;

-- Create app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'The application is currently undergoing maintenance. Please check back soon.',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT single_config_row CHECK (id = 1)
);

-- Add comments for documentation
COMMENT ON TABLE public.app_config IS
  'Application-wide configuration settings. Only contains a single row (id=1).';

COMMENT ON COLUMN public.app_config.maintenance_mode IS
  'When true, only super_admins can access the application.';

COMMENT ON COLUMN public.app_config.maintenance_message IS
  'Custom message displayed to users during maintenance mode.';

-- Insert default configuration row
INSERT INTO public.app_config (id, maintenance_mode, maintenance_message)
VALUES (1, FALSE, 'The application is currently undergoing maintenance. Please check back soon.')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone (including non-authenticated) can read config
-- This is necessary for the maintenance check before login
CREATE POLICY "Anyone can view app config"
  ON public.app_config
  FOR SELECT
  USING (true);

-- RLS Policy: Only super_admins can update config
CREATE POLICY "Only super_admins can update app config"
  ON public.app_config
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Create function to update maintenance mode with automatic timestamp
CREATE OR REPLACE FUNCTION public.update_maintenance_mode(
  p_maintenance_mode BOOLEAN,
  p_maintenance_message TEXT DEFAULT NULL
)
RETURNS TABLE(maintenance_mode BOOLEAN, maintenance_message TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message TEXT;
BEGIN
  -- Check if user is super_admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admins can update maintenance mode';
  END IF;

  -- Get current message if new one not provided
  IF p_maintenance_message IS NULL THEN
    SELECT ac.maintenance_message INTO v_message
    FROM public.app_config ac
    WHERE ac.id = 1;
  ELSE
    v_message := p_maintenance_message;
  END IF;

  -- Update the config
  UPDATE public.app_config ac
  SET
    maintenance_mode = p_maintenance_mode,
    maintenance_message = v_message,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE ac.id = 1;

  -- Return updated values
  RETURN QUERY
  SELECT ac.maintenance_mode, ac.maintenance_message, ac.updated_at
  FROM public.app_config ac
  WHERE ac.id = 1;
END;
$$;

COMMENT ON FUNCTION public.update_maintenance_mode IS
  'Updates maintenance mode settings. Only callable by super_admins.';

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
-- Notes:
--   - Table contains only one row (id=1) enforced by constraint
--   - Non-authenticated users can read config (for maintenance check)
--   - Only super_admins can update via RLS or helper function
--   - Helper function automatically tracks who/when updated
-- =====================================================
