-- Add password_changed_at column to profiles
ALTER TABLE public.profiles
ADD COLUMN password_changed_at timestamptz DEFAULT NULL;

-- Backfill: users who already changed password get current timestamp
UPDATE public.profiles
SET password_changed_at = now()
WHERE force_password_change = false;