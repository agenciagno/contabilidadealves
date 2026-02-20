

# Transferir DRE, Comparativo e Fluxo de Caixa para o Dashboard

## Resumo

Mover os componentes DRE, Comparativo de Periodos e Fluxo de Caixa Previsto da pagina Relatorios para o Dashboard, e reordenar os widgets do Dashboard conforme solicitado.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/pages/Dashboard.tsx` | Adicionar imports, dados e componentes; reordenar layout |

---

## 1. Novos Imports

Adicionar ao Dashboard.tsx:
- `import { DRECard } from '@/components/reports/DRECard';`
- `import { PeriodComparison } from '@/components/reports/PeriodComparison';`
- `import { CashFlowForecast } from '@/components/reports/CashFlowForecast';`
- `import { subMonths, startOfMonth, endOfMonth } from 'date-fns'` (alguns ja importados, completar os faltantes)
- `import { useReportData, processReportData } from '@/hooks/useReportData';`

---

## 2. Novos Dados (useMemo / queries)

### DRE
Calcular `dreData` a partir dos totais filtrados do Dashboard (receitas e despesas), com impostos = 15% do faturamento bruto (mesma logica da pagina Relatorios):

```typescript
const dreData = useMemo(() => {
  const faturamentoBruto = transactions.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
  const impostos = faturamentoBruto * 0.15;
  const despesasOperacionais = transactions.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
  return { faturamentoBruto, impostos, despesasOperacionais };
}, [transactions]);
```

### Comparativo de Periodos
Adicionar queries para mes atual e mes anterior usando `useReportData`:

```typescript
const thisMonthStart = startOfMonth(now);
const lastMonthStart = startOfMonth(subMonths(now, 1));
const lastMonthEnd = endOfMonth(subMonths(now, 1));

const { data: thisMonthTx = [] } = useReportData({ startDate: thisMonthStart, endDate: now });
const { data: lastMonthTx = [] } = useReportData({ startDate: lastMonthStart, endDate: lastMonthEnd });

const thisMonthData = useMemo(() => processReportData(thisMonthTx), [thisMonthTx]);
const lastMonthData = useMemo(() => processReportData(lastMonthTx), [lastMonthTx]);
```

---

## 3. Nova Ordem dos Widgets no Layout

Apos os cards de KPI e Ticker Anual, a nova ordem sera:

1. **Contas Pendentes** (movido para cima, antes da Evolucao Mensal)
2. **Evolucao Mensal** (grafico AreaChart existente)
3. **Receitas/Despesas por Evento Contabil** (pie charts existentes, grid 2 colunas)
4. **DRE** (novo - componente `DRECard`)
5. **Comparativo de Periodos** (novo - componente `PeriodComparison`)
6. **Fluxo de Caixa Previsto** (novo - componente `CashFlowForecast`)

---

## 4. Adicionar Widgets ao Config

Adicionar 3 novos widgets ao `DEFAULT_WIDGETS` em `DashboardWidgets.tsx` para permitir ativar/desativar:
- `{ id: 'dre', name: 'Resultado Operacional (DRE)', enabled: true }`
- `{ id: 'periodComparison', name: 'Comparativo de Periodos', enabled: true }`
- `{ id: 'cashFlowForecast', name: 'Fluxo de Caixa Previsto', enabled: true }`

---

## 5. Renderizacao dos Novos Componentes

```text
[KPIs 3 cols]
[Ticker 4 cols]
[Contas Pendentes]        <-- movido para cima
[Evolucao Mensal]
[Receitas por Cat | Despesas por Cat]
[DRE]                     <-- novo
[Comparativo de Periodos] <-- novo
[Fluxo de Caixa Previsto] <-- novo
[Dialogs]
```

Cada novo componente envolvido em `isWidgetEnabled('id')` para respeitar a personalizacao.

