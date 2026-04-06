
-- Add RBAC columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'colaborador',
  ADD COLUMN IF NOT EXISTS status_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Existing users become admin and don't need password change
UPDATE public.profiles SET role = 'admin', force_password_change = false WHERE role = 'colaborador';

-- Mark super admins
UPDATE public.profiles SET role = 'super_admin' WHERE is_super_admin = true;

-- Update default for allowed_modules (remove relatorios)
ALTER TABLE public.profiles 
  ALTER COLUMN allowed_modules SET DEFAULT ARRAY['financeiro','crm'];
