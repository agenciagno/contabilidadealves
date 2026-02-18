
-- Migration 1: Adicionar colunas em companies e profiles
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_modules text[] NOT NULL DEFAULT ARRAY['financeiro','crm','relatorios'];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_modules text[] NOT NULL DEFAULT ARRAY['financeiro','crm','relatorios'];

-- Promover Gabriel Alves a Super Admin
UPDATE public.profiles
  SET is_super_admin = true
  WHERE email = 'gwalves13@gmail.com';

-- Função is_super_admin como security definer (lê de profiles, não de user_roles)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;
