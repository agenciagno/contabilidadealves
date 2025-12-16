-- Permitir inserção anônima de empresas durante o cadastro
CREATE POLICY "Allow anonymous company creation during signup"
ON public.companies FOR INSERT
TO anon
WITH CHECK (true);

-- Permitir inserção de roles pelo próprio usuário
CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());