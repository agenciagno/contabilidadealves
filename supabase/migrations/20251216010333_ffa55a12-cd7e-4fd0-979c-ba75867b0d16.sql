-- Ensure API roles have base privileges on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Companies: allow anon to create during signup; authenticated can read/update own via RLS
GRANT INSERT ON TABLE public.companies TO anon;
GRANT SELECT, UPDATE ON TABLE public.companies TO authenticated;

-- Profiles: authenticated users manage their own rows via RLS
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- User roles: authenticated users insert/view their own roles via RLS
GRANT SELECT, INSERT ON TABLE public.user_roles TO authenticated;