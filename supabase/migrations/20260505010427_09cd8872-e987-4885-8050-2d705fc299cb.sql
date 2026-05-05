
-- Allow admins and super_admins to update profiles within their company
CREATE POLICY "Admins can update profiles in their company"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND (
    has_role(auth.uid(), 'admin')
    OR is_super_admin(auth.uid())
  )
);
