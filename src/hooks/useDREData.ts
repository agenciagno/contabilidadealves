import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories, Category } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useToast } from '@/hooks/use-toast';
import { format, lastDayOfMonth, parse } from 'date-fns';

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

export function useDREData(monthYear: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  const { banks } = useBanks();

  const invisibleBankIds = banks
    .filter(b => b.is_invisible)
    .map(b => b.id);

  const startDate = `${monthYear}-01`;
  const endDate = format(
    lastDayOfMonth(parse(`${monthYear}-01`, 'yyyy-MM-dd', new Date())),
    'yyyy-MM-dd'
  );

  // Fetch paid transactions for the month
  const { data: transactions = [] } = useQuery({
    queryKey: ['dre-transactions', monthYear, invisibleBankIds],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('category_id, paid_amount, amount, type')
        .is('deleted_at', null)
        .eq('is_paid', true)
        .gte('date', startDate)
        .lte('date', endDate);

      if (invisibleBankIds.length > 0) {
        const notInFilter = invisibleBankIds.map(id => `bank_id.neq.${id}`).join(',');
        query = query.or(`bank_id.is.null,and(${notInFilter})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!monthYear,
  });

  // Fetch budgets for the month
  const { data: budgets = [] } = useQuery({
    queryKey: ['dre-budgets', monthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dre_budgets')
        .select('*')
        .eq('month_year', monthYear);

      if (error) throw error;
      return data || [];
    },
    enabled: !!monthYear,
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
      const realizado = transactions
        .filter(t => t.category_id === cat.id)
        .reduce((s, t) => s + Number(t.paid_amount ?? t.amount), 0);

      const budget = budgets.find(b => b.category_id === cat.id);
      const previsto = budget ? Number(budget.budget_value) : 0;

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

    // Macros without children: treat as leaf (own transactions + budget)
    rows.forEach(row => {
      if (row.children.length === 0) {
        const realizado = transactions
          .filter(t => t.category_id === row.id)
          .reduce((s, t) => s + Number(t.paid_amount ?? t.amount), 0);
        const budget = budgets.find(b => b.category_id === row.id);
        const previsto = budget ? Number(budget.budget_value) : 0;
        row.realizado = realizado;
        row.previsto = previsto;
        row.rxp = realizado - previsto;
        row.isMacro = false; // editable since no children
      }
    });

    return {
      receitas: rows.filter(r => r.type === 'receita'),
      despesas: rows.filter(r => r.type === 'despesa'),
    };
  };

  const dreData = buildDRETree();

  // Upsert budget mutation
  const upsertBudget = useMutation({
    mutationFn: async ({ categoryId, value }: { categoryId: string; value: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { error } = await supabase
        .from('dre_budgets')
        .upsert(
          {
            company_id: profile.company_id,
            category_id: categoryId,
            month_year: monthYear,
            budget_value: value,
          },
          { onConflict: 'company_id,category_id,month_year' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dre-budgets', monthYear] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar orçamento', description: error.message, variant: 'destructive' });
    },
  });

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
    upsertBudget,
    isLoading: false,
  };
}
