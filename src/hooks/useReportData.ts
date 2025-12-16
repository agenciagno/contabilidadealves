import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  bankId?: string;
  transactionType?: string;
}

export interface ReportTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date: string;
  is_paid: boolean;
  category?: { id: string; name: string; color: string } | null;
  bank?: { id: string; name: string; color: string } | null;
}

export function useReportData(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-data', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          type,
          date,
          is_paid,
          category:categories(id, name, color),
          bank:banks(id, name, color)
        `)
        .order('date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      if (filters.endDate) {
        query = query.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      if (filters.categoryId && filters.categoryId !== 'all') {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.bankId && filters.bankId !== 'all') {
        query = query.eq('bank_id', filters.bankId);
      }
      if (filters.transactionType && filters.transactionType !== 'all') {
        query = query.eq('type', filters.transactionType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReportTransaction[];
    },
  });
}

export function processReportData(transactions: ReportTransaction[]) {
  // Totals
  const totals = transactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      if (t.type === 'receita') {
        acc.receitas += amount;
      } else {
        acc.despesas += amount;
      }
      return acc;
    },
    { receitas: 0, despesas: 0 }
  );

  // Category breakdown
  const categoryMap = new Map<string, { name: string; value: number; color: string; type: string }>();
  transactions.forEach((t) => {
    const catName = t.category?.name || 'Sem categoria';
    const catColor = t.category?.color || '#6B7280';
    const key = `${catName}-${t.type}`;
    const existing = categoryMap.get(key);
    if (existing) {
      existing.value += Number(t.amount);
    } else {
      categoryMap.set(key, { name: catName, value: Number(t.amount), color: catColor, type: t.type });
    }
  });

  const receitasByCategory = Array.from(categoryMap.values())
    .filter((c) => c.type === 'receita')
    .sort((a, b) => b.value - a.value);

  const despesasByCategory = Array.from(categoryMap.values())
    .filter((c) => c.type === 'despesa')
    .sort((a, b) => b.value - a.value);

  // Monthly breakdown
  const monthlyMap = new Map<string, { month: string; receitas: number; despesas: number }>();
  transactions.forEach((t) => {
    const monthKey = format(parseISO(t.date), 'yyyy-MM');
    const monthLabel = format(parseISO(t.date), 'MMM/yy', { locale: ptBR });
    const existing = monthlyMap.get(monthKey);
    const amount = Number(t.amount);
    
    if (existing) {
      if (t.type === 'receita') {
        existing.receitas += amount;
      } else {
        existing.despesas += amount;
      }
    } else {
      monthlyMap.set(monthKey, {
        month: monthLabel,
        receitas: t.type === 'receita' ? amount : 0,
        despesas: t.type === 'despesa' ? amount : 0,
      });
    }
  });

  const monthlyData = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, data]) => data);

  return {
    totals,
    receitasByCategory,
    despesasByCategory,
    monthlyData,
  };
}

export function exportToCSV(transactions: ReportTransaction[]) {
  const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Banco', 'Valor', 'Status'];
  const rows = transactions.map((t) => [
    format(parseISO(t.date), 'dd/MM/yyyy'),
    t.description,
    t.type === 'receita' ? 'Receita' : 'Despesa',
    t.category?.name || 'Sem categoria',
    t.bank?.name || 'Sem banco',
    Number(t.amount).toFixed(2).replace('.', ','),
    t.is_paid ? 'Pago' : 'Pendente',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
}
