import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { fetchValidFiscalContactIds } from '@/lib/fiscal-filters';
import { notifyTaskCompleted, notifyTaskAssigned } from '@/lib/fiscal-notifications';


export interface FiscalTask {
  id: string;
  company_id: string;
  contact_id: string;
  responsible_id: string | null;
  title: string;
  description: string | null;
  status: 'a_fazer' | 'aguardando_cliente' | 'em_progresso' | 'concluido';
  due_date: string;
  attachment_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FiscalTaskInsert = Omit<FiscalTask, 'id' | 'created_at' | 'updated_at'>;

export interface FiscalTaskFilters {
  startDate?: string;
  endDate?: string;
  contactId?: string;
  responsibleId?: string;
  titleSearch?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useFiscalTasks(filters: FiscalTaskFilters = {}) {
  const { user } = useAuth();
  const { company } = useCompany();
  const companyId = company?.id;
  const { isColaborador } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Profile of the current user — needed for colaborador filter AND for notification authoring
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile-fiscal', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });


  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['fiscal-tasks', companyId, filters, isColaborador, currentProfile?.id],
    queryFn: async () => {
      // Restrict to contacts with a tax regime defined
      const validContactIds = companyId ? await fetchValidFiscalContactIds(companyId) : [];

      let query = supabase
        .from('fiscal_tasks')
        .select('*')
        .order('due_date', { ascending: filters.sortOrder !== 'desc' });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (validContactIds.length === 0) {
        return [] as FiscalTask[];
      }
      query = query.in('contact_id', validContactIds);

      // RBAC: colaborador only sees their own tasks
      if (isColaborador && currentProfile?.id) {
        query = query.eq('responsible_id', currentProfile.id);
      }

      if (filters.startDate) {
        query = query.gte('due_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('due_date', filters.endDate);
      }
      if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      if (filters.responsibleId) {
        query = query.eq('responsible_id', filters.responsibleId);
      }
      if (filters.titleSearch) {
        query = query.ilike('title', `%${filters.titleSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FiscalTask[];
    },
    enabled: !!companyId && (!isColaborador || !!currentProfile?.id),
  });

  const createTask = useMutation({
    mutationFn: async (task: FiscalTaskInsert) => {
      const { data, error } = await supabase
        .from('fiscal_tasks')
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
      toast({ title: 'Tarefa criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FiscalTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('fiscal_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['fiscal-tasks'] });
      const snapshots = queryClient.getQueriesData<FiscalTask[]>({ queryKey: ['fiscal-tasks'] });
      snapshots.forEach(([key, old]) => {
        if (!old) return;
        queryClient.setQueryData<FiscalTask[]>(key, old.map((t) => (t.id === id ? { ...t, ...updates } as FiscalTask : t)));
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, old]) => queryClient.setQueryData(key, old));
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fiscal_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
      toast({ title: 'Tarefa excluída com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir tarefa', variant: 'destructive' });
    },
  });

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
}
