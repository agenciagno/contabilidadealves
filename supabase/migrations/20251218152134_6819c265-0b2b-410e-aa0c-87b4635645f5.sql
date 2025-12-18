-- Add username column to profiles for internal user login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Create an index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update RLS policy to allow admins to view profiles from their company
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles from their company" 
ON public.profiles 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

-- Allow admins to create profiles for users in their company
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert profiles for their company" 
ON public.profiles 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Allow admins to delete profiles from their company
CREATE POLICY "Admins can delete profiles from their company" 
ON public.profiles 
FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'));