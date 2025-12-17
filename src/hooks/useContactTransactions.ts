import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date: string;
  due_date: string | null;
  is_paid: boolean;
  category: { id: string; name: string; color: string | null } | null;
  bank: { id: string; name: string } | null;
}

export function useContactTransactions(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-transactions', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          type,
          date,
          due_date,
          is_paid,
          category:categories(id, name, color),
          bank:banks(id, name)
        `)
        .eq('contact_id', contactId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as ContactTransaction[];
    },
    enabled: !!contactId,
  });
}

export function useContactFinancialStatus(contactId: string | undefined, transactions?: ContactTransaction[]) {
  const today = new Date().toISOString().split('T')[0];
  
  if (!transactions) return { isInadimplente: false, overdueCount: 0 };
  
  const overdueTransactions = transactions.filter(
    t => !t.is_paid && t.due_date && t.due_date < today
  );
  
  return {
    isInadimplente: overdueTransactions.length > 0,
    overdueCount: overdueTransactions.length,
  };
}
