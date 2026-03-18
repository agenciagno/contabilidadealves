import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/hooks/useTransactions';
import { isEffectivelyPaid } from '@/lib/financial-utils';

export const PAGE_SIZE = 99;
export const IS_EMPTY = '__IS_EMPTY_OR_NULL__';

export interface ServerFilters {
  type?: string;
  categoryIds?: string[];
  bankId?: string;
  searchTerm?: string;
  columnFilters: {
    issue_date?: { start: string; end: string };
    issue_date_empty?: boolean;
    due_date?: { start: string; end: string };
    due_date_empty?: boolean;
    expected_date?: { start: string; end: string };
    expected_date_empty?: boolean;
    date?: { start: string; end: string };
    date_empty?: boolean;
    contactIds?: string[];
    eventNames?: string[];
    status?: string;
    amounts?: (number | string)[];
    paidAmounts?: (number | string)[];
  };
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

function applyFilters(
  query: any,
  filters: ServerFilters
) {
  // Always exclude soft-deleted records
  query = query.is('deleted_at', null);

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('category_id', filters.categoryIds);
  }
  if (filters.bankId && filters.bankId !== 'all') {
    query = query.eq('bank_id', filters.bankId);
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.replace(/%/g, '');
    query = query.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const cf = filters.columnFilters;

  // Date column filters
  if (cf.issue_date?.start) query = query.gte('issue_date', cf.issue_date.start);
  if (cf.issue_date?.end) query = query.lte('issue_date', cf.issue_date.end);
  if (cf.due_date?.start) query = query.gte('due_date', cf.due_date.start);
  if (cf.due_date?.end) query = query.lte('due_date', cf.due_date.end);
  if (cf.expected_date?.start) query = query.gte('expected_date', cf.expected_date.start);
  if (cf.expected_date?.end) query = query.lte('expected_date', cf.expected_date.end);
  if (cf.date?.start) query = query.gte('date', cf.date.start);
  if (cf.date?.end) query = query.lte('date', cf.date.end);

  // Amount filters
  if (cf.amounts && cf.amounts.length > 0) {
    query = query.in('amount', cf.amounts);
  }
  if (cf.paidAmounts && cf.paidAmounts.length > 0) {
    query = query.in('paid_amount', cf.paidAmounts);
  }

  // Contact multi-select + event names with OR logic
  const hasContacts = cf.contactIds && cf.contactIds.length > 0;
  const hasEvents = cf.eventNames && cf.eventNames.length > 0;

  if (hasContacts && hasEvents) {
    // OR: contact_id in list OR (contact_id is null AND description in list)
    const contactFilter = `contact_id.in.(${cf.contactIds!.join(',')})`;
    const eventFilter = `and(contact_id.is.null,description.in.(${cf.eventNames!.map(e => `"${e.replace(/"/g, '\\"')}"`).join(',')}))`;
    query = query.or(`${contactFilter},${eventFilter}`);
  } else if (hasContacts) {
    query = query.in('contact_id', cf.contactIds!);
  } else if (hasEvents) {
    query = query.is('contact_id', null).in('description', cf.eventNames!);
  }

  // Status filter — server-side we filter is_paid, but isEffectivelyPaid is checked on frontend
  if (cf.status === 'Pago') {
    query = query.eq('is_paid', true);
  } else if (cf.status === 'Pendente') {
    // Pendente includes is_paid=false OR is_paid=true but missing date/paid_amount (handled on frontend)
    // We can't fully express this in Supabase, so we don't filter server-side for Pendente
    // Frontend will re-check with isEffectivelyPaid
  }

  return query;
}

export function useServerTransactions(page: number, filters: ServerFilters) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['server-transactions', page, filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, color),
          bank:banks(id, name, color),
          contact:contacts(id, name, type)
        `, { count: 'exact' });

      query = applyFilters(query, filters);

      // Sorting
      const sortCol = filters.sortField || 'due_date';
      const ascending = filters.sortOrder === 'asc';
      query = query.order(sortCol, { ascending, nullsFirst: false });
      query = query.order('id', { ascending: false }); // stable sort tiebreaker

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      let rows = data as Transaction[];

      // Frontend defense: if status filter is "Pendente", also include is_paid=true that fail isEffectivelyPaid
      // If status is "Pago", exclude rows that don't pass isEffectivelyPaid
      if (filters.columnFilters.status === 'Pago') {
        rows = rows.filter(t => isEffectivelyPaid(t));
      } else if (filters.columnFilters.status === 'Pendente') {
        rows = rows.filter(t => !isEffectivelyPaid(t));
      }

      return { rows, count: count ?? 0 };
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

  return {
    transactions: data?.rows ?? [],
    totalCount: data?.count ?? 0,
    totalPages: Math.ceil((data?.count ?? 0) / PAGE_SIZE),
    isLoading,
    isFetching,
  };
}

// Separate KPI query — same filters, no pagination, minimal columns
export function useTransactionKPIs(filters: ServerFilters) {
  const { data, isLoading } = useQuery({
    queryKey: ['transaction-kpis', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('id, type, amount, paid_amount, is_paid, date, due_date');

      query = applyFilters(query, filters);

      // Fetch all rows (paginated to avoid 1000 limit)
      const allRows: any[] = [];
      const BATCH = 1000;
      let offset = 0;
      while (true) {
        const { data: batch, error } = await query.range(offset, offset + BATCH - 1);
        if (error) throw error;
        allRows.push(...(batch || []));
        if (!batch || batch.length < BATCH) break;
        offset += BATCH;
        // Re-create query for next page
        query = supabase.from('transactions').select('id, type, amount, paid_amount, is_paid, date, due_date');
        query = applyFilters(query, filters);
        query = query.is('deleted_at', null);
      }

      const today = new Date().toISOString().split('T')[0];

      let receitasPagas = 0, receitasPendentes = 0, despesasPagas = 0, despesasPendentes = 0;
      let contasEmAtraso = 0, receitasEmAtraso = 0;

      for (const t of allRows) {
        const paid = isEffectivelyPaid(t);
        const amt = Number(t.amount);
        const effAmt = paid && t.paid_amount != null ? Number(t.paid_amount) : amt;

        if (t.type === 'receita') {
          if (paid) receitasPagas += effAmt; else receitasPendentes += amt;
        } else {
          if (paid) despesasPagas += effAmt; else despesasPendentes += amt;
        }

        if (!paid && t.due_date && t.due_date < today) {
          if (t.type === 'receita') receitasEmAtraso += amt;
          else contasEmAtraso += amt;
        }
      }

      return { receitasPagas, receitasPendentes, despesasPagas, despesasPendentes, contasEmAtraso, receitasEmAtraso, totalFiltered: allRows.length };
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

  return {
    kpis: data ?? { receitasPagas: 0, receitasPendentes: 0, despesasPagas: 0, despesasPendentes: 0, contasEmAtraso: 0, receitasEmAtraso: 0, totalFiltered: 0 },
    isLoading,
  };
}
