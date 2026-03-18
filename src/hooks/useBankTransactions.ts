import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BankStatementRow {
  id: string;
  date: string;
  contact_name: string | null;
  category_name: string | null;
  bank_name: string | null;
  bank_id: string | null;
  description: string;
  type: 'receita' | 'despesa';
  amount: number;
  signed_amount: number;
  running_balance: number;
  is_paid: boolean;
}

export interface BankStatementFilters {
  bankId: string | 'all';
  startDate?: string | null;
  endDate?: string | null;
  contactId?: string | null;
  categoryId?: string | null;
}

export interface BankStatementResult {
  rows: BankStatementRow[];
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  isLoading: boolean;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function useBankTransactions(
  filters: BankStatementFilters,
  banks: { id: string; initial_balance: number; is_active: boolean }[] = []
): BankStatementResult {
  const { bankId, startDate, endDate, contactId, categoryId } = filters;

  // Query 1: All transactions before startDate (for opening_balance)
  const { data: priorTransactions = [], isLoading: isLoadingPrior } = useQuery({
    queryKey: ['bank-transactions-prior', bankId, startDate],
    queryFn: async () => {
      if (!startDate) return [];

      let query = supabase
        .from('transactions')
        .select('type, amount, paid_amount, bank_id, is_paid')
        .is('deleted_at', null)
        .lt('date', startDate)
        .eq('is_paid', true);

      if (bankId !== 'all') {
        query = query.eq('bank_id', bankId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!startDate,
    staleTime: 1000 * 30,
  });

  // Query 2: Transactions in period with filters
  const { data: periodTransactions = [], isLoading: isLoadingPeriod } = useQuery({
    queryKey: ['bank-transactions-period', bankId, startDate, endDate, contactId, categoryId],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          id, date, description, type, amount, paid_amount, is_paid, bank_id,
          contacts:contact_id (name),
          categories:category_id (name),
          banks:bank_id (name)
        `)
        .is('deleted_at', null)
        .eq('is_paid', true)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (bankId !== 'all') {
        query = query.eq('bank_id', bankId);
      }

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      if (contactId) query = query.eq('contact_id', contactId);
      if (categoryId) query = query.eq('category_id', categoryId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30,
  });

  // Calculate opening balance
  let baseBalance = 0;
  if (bankId === 'all') {
    // Sum all active banks' initial_balance
    baseBalance = banks
      .filter(b => b.is_active)
      .reduce((sum, b) => sum + Number(b.initial_balance), 0);
  } else {
    const bank = banks.find(b => b.id === bankId);
    baseBalance = bank ? Number(bank.initial_balance) : 0;
  }

  const priorBalance = priorTransactions.reduce((sum, t: any) => {
    const eff = t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount);
    const signed = t.type === 'receita' ? eff : -eff;
    return sum + signed;
  }, 0);

  const openingBalance = startDate ? baseBalance + priorBalance : baseBalance;

  // Build statement rows with running balance
  let runningBalance = openingBalance;
  const rows: BankStatementRow[] = periodTransactions.map((t: any) => {
    const eff = t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount);
    const signed = t.type === 'receita' ? eff : -eff;
    runningBalance += signed;
    return {
      id: t.id,
      date: formatDate(t.date),
      contact_name: t.contacts?.name ?? null,
      category_name: t.categories?.name ?? null,
      bank_name: t.banks?.name ?? null,
      bank_id: t.bank_id,
      description: t.description,
      type: t.type as 'receita' | 'despesa',
      amount: eff,
      signed_amount: signed,
      running_balance: runningBalance,
      is_paid: t.is_paid,
    };
  });

  const totalIncome = rows
    .filter(r => r.type === 'receita')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = rows
    .filter(r => r.type === 'despesa')
    .reduce((sum, r) => sum + r.amount, 0);

  const closingBalance = openingBalance + totalIncome - totalExpense;

  return {
    rows,
    openingBalance,
    totalIncome,
    totalExpense,
    closingBalance,
    isLoading: isLoadingPrior || isLoadingPeriod,
  };
}
