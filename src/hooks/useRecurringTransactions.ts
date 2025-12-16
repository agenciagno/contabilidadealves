import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringTransaction {
  id: string;
  company_id: string;
  category_id: string | null;
  bank_id: string | null;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  frequency: 'weekly' | 'monthly' | 'yearly';
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; color: string } | null;
  bank?: { id: string; name: string; color: string } | null;
}

export type RecurringTransactionInsert = {
  category_id?: string | null;
  bank_id?: string | null;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  frequency?: 'weekly' | 'monthly' | 'yearly';
  day_of_month?: number | null;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  notes?: string | null;
};

export type RecurringTransactionUpdate = Partial<RecurringTransactionInsert>;

export function useRecurringTransactions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recurringTransactions = [], isLoading, error } = useQuery({
    queryKey: ['recurring_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
          *,
          category:categories(id, name, color),
          bank:banks(id, name, color)
        `)
        .order('description');

      if (error) throw error;
      return data as RecurringTransaction[];
    },
  });

  const createRecurring = useMutation({
    mutationFn: async (recurring: RecurringTransactionInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({ ...recurring, company_id: profile.company_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
      toast({ title: 'Conta recorrente criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar conta recorrente', description: error.message, variant: 'destructive' });
    },
  });

  const updateRecurring = useMutation({
    mutationFn: async ({ id, ...updates }: RecurringTransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
      toast({ title: 'Conta recorrente atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar conta recorrente', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRecurring = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
      toast({ title: 'Conta recorrente excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir conta recorrente', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
    },
  });

  // Calculate monthly totals
  const monthlyTotals = recurringTransactions
    .filter(r => r.is_active)
    .reduce(
      (acc, r) => {
        let monthlyAmount = Number(r.amount);
        if (r.frequency === 'weekly') monthlyAmount *= 4;
        if (r.frequency === 'yearly') monthlyAmount /= 12;

        if (r.type === 'receita') {
          acc.receitas += monthlyAmount;
        } else {
          acc.despesas += monthlyAmount;
        }
        return acc;
      },
      { receitas: 0, despesas: 0 }
    );

  return {
    recurringTransactions,
    isLoading,
    error,
    monthlyTotals,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    toggleActive,
  };
}
