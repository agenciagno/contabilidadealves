import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories, Category } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';

export interface DRERow {
  id: string;
  name: string;
  type: 'receita' | 'despesa';
  parentId: string | null;
  previsto: number;
  realizado: number;
  rxp: number;
  children: DRERow[];
  isMacro: boolean;
}

export function useDREData(startDate: string, endDate: string) {
  const { categories } = useCategories();
  const { banks } = useBanks();

  const invisibleBankIds = banks
    .filter(b => b.is_invisible)
    .map(b => b.id);

  const buildInvisibleFilter = (query: any) => {
    if (invisibleBankIds.length > 0) {
      const notInFilter = invisibleBankIds.map(id => `bank_id.neq.${id}`).join(',');
      return query.or(`bank_id.is.null,and(${notInFilter})`);
    }
    return query;
  };

  // Query "Previsto": pending transactions with expected_date in range
  const { data: previstoTxns = [] } = useQuery({
    queryKey: ['dre-previsto', startDate, endDate, invisibleBankIds],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('category_id, amount, type')
        .is('deleted_at', null)
        .eq('is_paid', false)
        .not('expected_date', 'is', null)
        .gte('expected_date', startDate)
        .lte('expected_date', endDate);

      query = buildInvisibleFilter(query);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!startDate && !!endDate,
  });

  // Query "Realizado": paid transactions with date (payment date) in range
  const { data: realizadoTxns = [] } = useQuery({
    queryKey: ['dre-realizado', startDate, endDate, invisibleBankIds],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('category_id, paid_amount, amount, type')
        .is('deleted_at', null)
        .eq('is_paid', true)
        .not('date', 'is', null)
        .gte('date', startDate)
        .lte('date', endDate);

      query = buildInvisibleFilter(query);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!startDate && !!endDate,
  });

  // Build DRE tree
  const buildDRETree = (): { receitas: DRERow[]; despesas: DRERow[] } => {
    const macros = categories.filter(c => !c.parent_id);
    const subs = categories.filter(c => c.parent_id);

    const buildRow = (cat: Category, children: Category[]): DRERow => {
      const isMacro = children.length > 0;

      if (isMacro) {
        const childRows = children.map(child => buildRow(child, []));
        return {
          id: cat.id,
          name: cat.name,
          type: cat.type as 'receita' | 'despesa',
          parentId: null,
          previsto: childRows.reduce((s, r) => s + r.previsto, 0),
          realizado: childRows.reduce((s, r) => s + r.realizado, 0),
          rxp: childRows.reduce((s, r) => s + r.rxp, 0),
          children: childRows,
          isMacro: true,
        };
      }

      // Leaf node
      const previsto = previstoTxns
        .filter(t => t.category_id === cat.id)
        .reduce((s, t) => s + Number(t.amount), 0);

      const realizado = realizadoTxns
        .filter(t => t.category_id === cat.id)
        .reduce((s, t) => s + Number(t.paid_amount ?? t.amount), 0);

      return {
        id: cat.id,
        name: cat.name,
        type: cat.type as 'receita' | 'despesa',
        parentId: cat.parent_id,
        previsto,
        realizado,
        rxp: realizado - previsto,
        children: [],
        isMacro: false,
      };
    };

    const rows: DRERow[] = macros.map(macro => {
      const children = subs.filter(s => s.parent_id === macro.id);
      return buildRow(macro, children);
    });

    // Macros without children: treat as leaf
    rows.forEach(row => {
      if (row.children.length === 0) {
        const previsto = previstoTxns
          .filter(t => t.category_id === row.id)
          .reduce((s, t) => s + Number(t.amount), 0);
        const realizado = realizadoTxns
          .filter(t => t.category_id === row.id)
          .reduce((s, t) => s + Number(t.paid_amount ?? t.amount), 0);
        row.previsto = previsto;
        row.realizado = realizado;
        row.rxp = realizado - previsto;
        row.isMacro = false;
      }
    });

    return {
      receitas: rows.filter(r => r.type === 'receita'),
      despesas: rows.filter(r => r.type === 'despesa'),
    };
  };

  const dreData = buildDRETree();

  const totalReceitas = {
    previsto: dreData.receitas.reduce((s, r) => s + r.previsto, 0),
    realizado: dreData.receitas.reduce((s, r) => s + r.realizado, 0),
  };

  const totalDespesas = {
    previsto: dreData.despesas.reduce((s, r) => s + r.previsto, 0),
    realizado: dreData.despesas.reduce((s, r) => s + r.realizado, 0),
  };

  const resultadoLiquido = {
    previsto: totalReceitas.previsto - totalDespesas.previsto,
    realizado: totalReceitas.realizado - totalDespesas.realizado,
    rxp: (totalReceitas.realizado - totalDespesas.realizado) - (totalReceitas.previsto - totalDespesas.previsto),
  };

  return {
    dreData,
    totalReceitas,
    totalDespesas,
    resultadoLiquido,
    isLoading: false,
  };
}
