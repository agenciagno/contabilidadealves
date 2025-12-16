import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  company_id: string;
  category_id: string | null;
  bank_id: string | null;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date: string;
  is_paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; color: string } | null;
  bank?: { id: string; name: string; color: string } | null;
}

export type TransactionInsert = {
  category_id?: string | null;
  bank_id?: string | null;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date: string;
  is_paid?: boolean;
  notes?: string | null;
};

export type TransactionUpdate = Partial<TransactionInsert>;

interface UseTransactionsOptions {
  month?: number;
  year?: number;
  type?: 'receita' | 'despesa';
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { month, year, type } = options;

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions', { month, year, type }],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, color),
          bank:banks(id, name, color)
        `)
        .order('date', { ascending: false });

      if (month !== undefined && year !== undefined) {
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        query = query.gte('date', startDate).lte('date', endDate);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, company_id: profile.company_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] }); // Refresh bank balances
      toast({ title: 'Transação criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar transação', description: error.message, variant: 'destructive' });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({ title: 'Transação atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar transação', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({ title: 'Transação excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir transação', description: error.message, variant: 'destructive' });
    },
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_paid })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      if (t.type === 'receita') {
        acc.receitas += amount;
        if (t.is_paid) acc.receitasPagas += amount;
      } else {
        acc.despesas += amount;
        if (t.is_paid) acc.despesasPagas += amount;
      }
      return acc;
    },
    { receitas: 0, despesas: 0, receitasPagas: 0, despesasPagas: 0 }
  );

  return {
    transactions,
    isLoading,
    error,
    totals,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    togglePaid,
  };
}
