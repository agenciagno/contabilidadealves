ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NULL;

UPDATE public.profiles
  SET password_changed_at = NOW()
  WHERE password_changed_at IS NULL;