CREATE POLICY "Users can delete logs from their company"
ON public.contact_logs
FOR DELETE
TO public
USING ((company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete global logs from their company"
ON public.global_logs
FOR DELETE
TO public
USING ((company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid()));