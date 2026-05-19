import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

export interface Collaborator {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  status_active: boolean;
}

export interface CoverageRow {
  id: string;
  company_id: string;
  absent_profile_id: string;
  covering_profile_id: string;
  start_date: string;
  end_date: string | null;
  reason: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export function useCollaborators() {
  const { company } = useCompany();
  const companyId = company?.id;
  return useQuery<Collaborator[]>({
    queryKey: ['collaborators', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, avatar_url, status_active')
        .eq('company_id', companyId)
        .eq('status_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Collaborator[];
    },
    enabled: !!companyId,
  });
}

export function useCoverages() {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const query = useQuery<CoverageRow[]>({
    queryKey: ['coverages', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('collaborator_coverage')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CoverageRow[];
    },
    enabled: !!companyId,
  });

  const createCoverage = useMutation({
    mutationFn: async (input: {
      absent_profile_id: string;
      covering_profile_id: string;
      start_date: string;
      end_date: string | null;
      reason: string;
      created_by: string | null;
    }) => {
      if (!companyId) throw new Error('No company');
      const { error } = await (supabase as any).from('collaborator_coverage').insert({
        company_id: companyId,
        is_active: true,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coverages', companyId] }),
  });

  const endCoverage = useMutation({
    mutationFn: async (id: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await (supabase as any)
        .from('collaborator_coverage')
        .update({ is_active: false, end_date: today })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coverages', companyId] }),
  });

  return { coverages: query.data ?? [], isLoading: query.isLoading, createCoverage, endCoverage };
}

export function usePendingTasksByProfile(year: number, month: number) {
  const { company } = useCompany();
  const companyId = company?.id;
  return useQuery<Record<string, number>>({
    queryKey: ['pending-tasks-by-profile', companyId, year, month],
    queryFn: async () => {
      if (!companyId) return {};
      const { data, error } = await (supabase as any)
        .from('fiscal_tasks')
        .select('responsible_id, status')
        .eq('company_id', companyId)
        .eq('competence_year', year)
        .eq('competence_month', month);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((row: any) => {
        if (row.status === 'concluido') return;
        const key = row.responsible_id ?? '__none__';
        map[key] = (map[key] ?? 0) + 1;
      });
      return map;
    },
    enabled: !!companyId,
  });
}
