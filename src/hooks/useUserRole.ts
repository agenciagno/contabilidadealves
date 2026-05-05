import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-role-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_super_admin, allowed_modules, force_password_change, password_changed_at, avatar_url, status_active, full_name, email')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const role = data?.role ?? 'colaborador';

  return {
    role,
    isSuperAdmin: role === 'super_admin' || (data?.is_super_admin ?? false),
    isAdmin: role === 'admin',
    isColaborador: role === 'colaborador',
    allowedModules: (data?.allowed_modules as string[]) ?? ['home', 'financeiro', 'clientes'],
    forcePasswordChange: data?.password_changed_at == null,
    avatarUrl: data?.avatar_url ?? null,
    statusActive: data?.status_active ?? true,
    fullName: data?.full_name ?? null,
    email: data?.email ?? null,
    isLoading,
  };
}
