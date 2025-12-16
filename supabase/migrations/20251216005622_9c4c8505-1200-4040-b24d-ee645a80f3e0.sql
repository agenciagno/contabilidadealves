-- Drop the restrictive policy
DROP POLICY IF EXISTS "Allow anonymous company creation during signup" ON public.companies;

-- Recreate as PERMISSIVE (default behavior without RESTRICTIVE keyword)
CREATE POLICY "Allow anonymous company creation during signup"
ON public.companies FOR INSERT
TO anon
WITH CHECK (true);