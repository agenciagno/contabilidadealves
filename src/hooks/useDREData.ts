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
  percentPrevisto: number;
  percentRealizado: number;
  children: DRERow[];
  isMacro: boolean;
}

export interface DRETotals {
  previsto: number;
  realizado: number;
  rxp: number;
}

export const DRE_SECTIONS = [
  { key: 'receitas_operacionais', label: 'Receitas Operacionais' },
  { key: 'deducoes_receita', label: 'Deduções Receita Bruta' },
  { key: 'custo_pessoal', label: 'Custo com Pessoal' },
  { key: 'despesas_fixas', label: 'Despesas Fixas' },
  { key: 'despesas_variaveis', label: 'Despesas Variáveis' },
  { key: 'despesas_imobilizados', label: 'Despesas com Imobilizados' },
  { key: 'despesas_financeiras', label: 'Despesas Financeiras' },
  { key: 'receita_financeira', label: '(+) Receita Financeira' },
  { key: 'despesas_tributarias', label: 'Despesas Tributárias' },
  { key: 'despesas_parcelamentos', label: 'Desp. c/ Parcelamentos' },
  { key: 'despesas_terceirizacao', label: 'Desp. c/ Terc. de Serviços' },
  { key: 'despesas_socios', label: 'Despesas c/ Sócios' },
  { key: 'nao_operacional_receita', label: 'Receitas não Operacionais' },
  { key: 'nao_operacional_despesa', label: 'Despesas não Operacionais' },
] as const;

export type DRESectionKey = typeof DRE_SECTIONS[number]['key'];

function sumTotals(rows: DRERow[]): DRETotals {
  const previsto = rows.reduce((s, r) => s + r.previsto, 0);
  const realizado = rows.reduce((s, r) => s + r.realizado, 0);
  return { previsto, realizado, rxp: realizado - previsto };
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

  // Build section data
  const buildSections = () => {
    const macros = categories.filter(c => !c.parent_id);
    const subs = categories.filter(c => c.parent_id);

    // First pass: compute receitaLiquida for percentage calc
    const getSectionMacros = (sectionKey: string) =>
      macros
        .filter(c => c.dre_section === sectionKey)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const buildRow = (cat: Category, children: Category[], receitaLiquidaRef: number): DRERow => {
      const isMacro = children.length > 0;

      if (isMacro) {
        const childRows = children.map(child => buildRow(child, [], receitaLiquidaRef));
        const previsto = childRows.reduce((s, r) => s + r.previsto, 0);
        const realizado = childRows.reduce((s, r) => s + r.realizado, 0);
        const rxp = realizado - previsto;
        return {
          id: cat.id,
          name: cat.name,
          type: cat.type as 'receita' | 'despesa',
          parentId: null,
          previsto,
          realizado,
          rxp,
          percentPrevisto: receitaLiquidaRef ? (previsto / receitaLiquidaRef) * 100 : 0,
          percentRealizado: receitaLiquidaRef ? (realizado / receitaLiquidaRef) * 100 : 0,
          children: childRows,
          isMacro: true,
        };
      }

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
        percentPrevisto: receitaLiquidaRef ? (previsto / receitaLiquidaRef) * 100 : 0,
        percentRealizado: receitaLiquidaRef ? (realizado / receitaLiquidaRef) * 100 : 0,
        children: [],
        isMacro: false,
      };
    };

    const buildSectionRows = (sectionKey: string, receitaLiquidaRef: number): DRERow[] => {
      const sectionMacros = getSectionMacros(sectionKey);
      return sectionMacros.map(macro => {
        const children = subs.filter(s => s.parent_id === macro.id);
        const row = buildRow(macro, children, receitaLiquidaRef);
        // Macro without children: leaf
        if (row.children.length === 0 && row.isMacro) {
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
          row.percentPrevisto = receitaLiquidaRef ? (previsto / receitaLiquidaRef) * 100 : 0;
          row.percentRealizado = receitaLiquidaRef ? (realizado / receitaLiquidaRef) * 100 : 0;
        }
        return row;
      });
    };

    // First pass without percentages to get receitaLiquida
    const receitasOp = buildSectionRows('receitas_operacionais', 0);
    const deducoes = buildSectionRows('deducoes_receita', 0);

    const receitaBruta = sumTotals(receitasOp);
    const totalDeducoes = sumTotals(deducoes);
    const receitaLiquida: DRETotals = {
      previsto: receitaBruta.previsto + totalDeducoes.previsto,
      realizado: receitaBruta.realizado + totalDeducoes.realizado,
      rxp: (receitaBruta.realizado + totalDeducoes.realizado) - (receitaBruta.previsto + totalDeducoes.previsto),
    };

    const rlPrev = receitaLiquida.previsto;
    const rlReal = receitaLiquida.realizado;

    // Rebuild with percentages
    const sections: Record<string, DRERow[]> = {};
    for (const sec of DRE_SECTIONS) {
      // Use rlReal for % realizado reference, rlPrev for % previsto
      sections[sec.key] = buildSectionRows(sec.key, Math.abs(rlReal) || Math.abs(rlPrev) || 1);
    }

    // Recompute totals with final data
    const recBruta = sumTotals(sections.receitas_operacionais);
    const deduc = sumTotals(sections.deducoes_receita);
    const recLiq: DRETotals = {
      previsto: recBruta.previsto + deduc.previsto,
      realizado: recBruta.realizado + deduc.realizado,
      rxp: (recBruta.realizado + deduc.realizado) - (recBruta.previsto + deduc.previsto),
    };

    const custoPessoalTotal = sumTotals(sections.custo_pessoal);
    const lucroBruto: DRETotals = {
      previsto: recLiq.previsto - custoPessoalTotal.previsto,
      realizado: recLiq.realizado - custoPessoalTotal.realizado,
      rxp: (recLiq.realizado - custoPessoalTotal.realizado) - (recLiq.previsto - custoPessoalTotal.previsto),
    };

    const despFixas = sumTotals(sections.despesas_fixas);
    const despVar = sumTotals(sections.despesas_variaveis);
    const despImob = sumTotals(sections.despesas_imobilizados);
    const despFin = sumTotals(sections.despesas_financeiras);
    const recFin = sumTotals(sections.receita_financeira);
    const despTrib = sumTotals(sections.despesas_tributarias);
    const despParc = sumTotals(sections.despesas_parcelamentos);
    const despTerc = sumTotals(sections.despesas_terceirizacao);

    const totalDespOp: DRETotals = {
      previsto: despFixas.previsto + despVar.previsto + despImob.previsto + despFin.previsto - recFin.previsto + despTrib.previsto + despParc.previsto + despTerc.previsto,
      realizado: despFixas.realizado + despVar.realizado + despImob.realizado + despFin.realizado - recFin.realizado + despTrib.realizado + despParc.realizado + despTerc.realizado,
      rxp: 0,
    };
    totalDespOp.rxp = totalDespOp.realizado - totalDespOp.previsto;

    const lucroOp: DRETotals = {
      previsto: lucroBruto.previsto - totalDespOp.previsto,
      realizado: lucroBruto.realizado - totalDespOp.realizado,
      rxp: (lucroBruto.realizado - totalDespOp.realizado) - (lucroBruto.previsto - totalDespOp.previsto),
    };

    const despSocios = sumTotals(sections.despesas_socios);
    const lucroOp2: DRETotals = {
      previsto: lucroOp.previsto - despSocios.previsto,
      realizado: lucroOp.realizado - despSocios.realizado,
      rxp: (lucroOp.realizado - despSocios.realizado) - (lucroOp.previsto - despSocios.previsto),
    };

    const naoOpRec = sumTotals(sections.nao_operacional_receita);
    const naoOpDesp = sumTotals(sections.nao_operacional_despesa);
    const lucroPrejuizo: DRETotals = {
      previsto: lucroOp2.previsto + naoOpRec.previsto - naoOpDesp.previsto,
      realizado: lucroOp2.realizado + naoOpRec.realizado - naoOpDesp.realizado,
      rxp: (lucroOp2.realizado + naoOpRec.realizado - naoOpDesp.realizado) - (lucroOp2.previsto + naoOpRec.previsto - naoOpDesp.previsto),
    };

    // Fluxo de caixa = soma dos saldos de bancos visíveis
    const fluxoCaixa = banks
      .filter(b => !b.is_invisible && b.is_active)
      .reduce((s, b) => s + Number(b.current_balance), 0);

    return {
      sections,
      receitaBruta: recBruta,
      totalDeducoes: deduc,
      receitaLiquida: recLiq,
      custoPessoalTotal,
      lucroBruto,
      totalDespesasOperacionais: totalDespOp,
      lucroOperacional: lucroOp,
      despesasSociosTotal: despSocios,
      lucroOperacional2: lucroOp2,
      naoOperacionalReceita: naoOpRec,
      naoOperacionalDespesa: naoOpDesp,
      lucroPrejuizoLiquido: lucroPrejuizo,
      fluxoCaixa,
    };
  };

  const result = buildSections();

  return {
    ...result,
    isLoading: false,
  };
}
