import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createGlobalLog } from '@/hooks/useGlobalLogs';

export interface Transaction {
  id: string;
  company_id: string;
  category_id: string | null;
  bank_id: string | null;
  contact_id: string | null;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date: string | null;
  issue_date: string | null;
  due_date: string | null;
  expected_date: string | null;
  is_paid: boolean;
  paid_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; color: string } | null;
  bank?: { id: string; name: string; color: string } | null;
  contact?: { id: string; name: string; type: string } | null;
}

export type TransactionInsert = {
  category_id?: string | null;
  bank_id?: string | null;
  contact_id?: string | null;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  expected_date?: string | null;
  is_paid?: boolean;
  paid_amount?: number | null;
  notes?: string | null;
};

export type TransactionUpdate = Partial<TransactionInsert>;

export function useTransactions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      let allData: Transaction[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            category:categories(id, name, color),
            bank:banks(id, name, color),
            contact:contacts(id, name, type)
          `)
          .order('date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        allData = allData.concat(data as Transaction[]);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allData;
    },
    staleTime: 1000 * 30, // 30 seconds - data is fresh
    gcTime: 1000 * 60 * 5, // 5 minutes - garbage collection
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
      
      // Log to global audit
      await createGlobalLog({
        action: 'ADICAO',
        module: 'FINANCEIRO',
        entityId: data.id,
        entityName: transaction.description,
        details: `Transação "${transaction.description}" criada - ${transaction.type === 'receita' ? 'Receita' : 'Despesa'} de R$ ${Number(transaction.amount).toFixed(2)}`,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['global-logs'] });
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
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['global-logs'] });
      toast({ title: 'Transação atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar transação', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      // Get transaction info before deleting for logging
      const { data: transaction } = await supabase
        .from('transactions')
        .select('description, amount, type')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Log deletion
      if (transaction) {
        await createGlobalLog({
          action: 'EXCLUSAO',
          module: 'FINANCEIRO',
          entityId: id,
          entityName: transaction.description,
          details: `Transação "${transaction.description}" excluída - ${transaction.type === 'receita' ? 'Receita' : 'Despesa'} de R$ ${Number(transaction.amount).toFixed(2)}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['global-logs'] });
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
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const bulkTogglePaid = useMutation({
    mutationFn: async ({ ids, is_paid }: { ids: string[]; is_paid: boolean }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_paid })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const bulkCreateTransactions = useMutation({
    mutationFn: async (transactions: TransactionInsert[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const withCompany = transactions.map(t => ({
        ...t,
        company_id: profile.company_id,
      }));

      const BATCH_SIZE = 500;
      let totalInserted = 0;
      for (let i = 0; i < withCompany.length; i += BATCH_SIZE) {
        const batch = withCompany.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('transactions').insert(batch);
        if (error) throw error;
        totalInserted += batch.length;
      }

      await createGlobalLog({
        action: 'ADICAO',
        module: 'FINANCEIRO',
        details: `${totalInserted} transações importadas via planilha`,
      });

      return totalInserted;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['global-logs'] });
      toast({ title: `${count} transações importadas com sucesso!` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro na importação em massa', description: error.message, variant: 'destructive' });
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
    bulkTogglePaid,
    bulkCreateTransactions,
  };
}
