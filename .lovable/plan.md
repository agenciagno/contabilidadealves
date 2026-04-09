

## Plano: Reestruturar DRE para Espelhar Exatamente o Layout do PDF

### Problema

A DRE atual divide tudo em 2 blocos genéricos ("Receitas" e "Despesas") e calcula apenas um "Resultado Líquido". O PDF tem **15 grupos macro** em sequência específica e **7 linhas calculadas intermediárias**, incluindo "Despesas c/ Sócios" entre "Lucro Operacional" e "Despesas/Receitas não Operacionais".

### Estrutura-Alvo Corrigida (extraída do PDF)

```text
┌──────────────────────────────────────────────────────┐
│ RECEITAS OPERACIONAIS (macro)                        │
│   ↳ sub-eventos em ordem alfabética                  │
├─── RECEITA BRUTA (calculada = soma Rec. Operacionais)│
│ DEDUÇÕES RECEITA BRUTA (macro)                       │
│   ↳ sub-eventos em ordem alfabética                  │
├─── RECEITA LÍQUIDA (calc = Bruta - Deduções)  ──────┤
│ CUSTO COM PESSOAL (macro)                            │
│   ↳ sub-eventos em ordem alfabética                  │
├─── LUCRO BRUTO (calc = Líquida - Pessoal) ──────────┤
│ DESPESAS FIXAS (macro)                               │
│ DESPESAS VARIÁVEIS (macro)                           │
│ DESPESAS IMOBILIZADOS (macro)                        │
│ DESPESAS FINANCEIRAS (macro)                         │
│ (+) RECEITA FINANCEIRA (macro)                       │
│ DESPESAS TRIBUTÁRIAS (macro)                         │
│ DESPESAS C/ PARCELAMENTOS (macro)                    │
│ DESPESAS C/ TERC. DE SERVIÇOS (macro)                │
├─── LUCRO/PREJUÍZO OPERACIONAL (calculada) ──────────┤
│ DESPESAS C/ SÓCIOS (macro)                           │
│   ↳ sub-eventos em ordem alfabética                  │
├─── LUCRO/PREJUÍZO OPERACIONAL (2) (calculada) ──────┤
├─── DESPESAS/RECEITAS NÃO OPERACIONAIS (calculada) ──┤
│ EMPRÉSTIMOS RECEBIDOS PF/PJ (macro)                 │
│ DESPESAS EMPRÉSTIMOS (macro)                         │
├─── LUCRO/PREJUÍZO LÍQUIDO (calculada final) ────────┤
└──────────────────────────────────────────────────────┘
```

### Colunas que Faltam na DRE Atual (existem no PDF)

| Coluna | Descrição |
|---|---|
| **% Previsto** | Percentual do item sobre a Receita Líquida Prevista |
| **% Realizado** | Percentual do item sobre a Receita Líquida Realizada |
| **Análise** (resumo topo) | Indicador textual (Positivo/Negativo) — será omitido pois é exclusivo do resumo do Excel |
| **Saldo a Pagar** (resumo topo) | Diferença entre previsto e realizado pendente — será omitido pois é fluxo de caixa |

### Informações de Cabeçalho que Faltam (existem no PDF)

| Info | Descrição |
|---|---|
| **Resumo Balancete** | Painel resumo no topo com Receita Líquida, Custo Pessoal, Despesas Operacionais, Receitas/Despesas não Operacionais, Lucro/Prejuízo |
| **Data Inicial / Data Final** | Já existe (Date Range Picker) |
| **Mês/Ano** | Label dinâmico baseado no período selecionado (ex: "abril-26") |
| **Fluxo de Caixa** | Valor do saldo em caixa no período |
| **Lucro/Prejuízo Médio Anual** | Cálculo do lucro médio baseado nos meses do ano |
| **Total Despesas %** | Linha calculada com % total de despesas sobre receita líquida |

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/hooks/useDREData.ts` | Reescrever: match macros por `name` na estrutura fixa; calcular linhas intermediárias + colunas % Previsto e % Realizado |
| 2 | `src/pages/DRE.tsx` | Reescrever: renderizar estrutura fixa com macros, sub-eventos (alfabéticos), linhas calculadas destacadas, painel resumo no topo, colunas % |

### Detalhes Técnicos

**Nenhuma alteração no cadastro de Eventos Contábeis.** A DRE fará match por nome exato do Evento Macro cadastrado com a lista fixa de seções. Macros que não correspondem a nenhuma seção conhecida serão ignorados na DRE. Os sub-eventos serão puxados automaticamente via `parent_id` e ordenados alfabeticamente.

**1. `useDREData.ts` — Nova lógica**

Define um array fixo `DRE_SECTIONS` com a sequência de nomes de macro e linhas calculadas. Para cada seção, busca o macro com aquele nome exato (case-insensitive), constrói o roll-up dos sub-eventos (ordenados alfabeticamente):

```typescript
const DRE_STRUCTURE = [
  { type: 'section', name: 'Receitas Operacionais' },
  { type: 'calculated', key: 'receita_bruta', label: 'Receita Bruta',
    calc: (ctx) => ctx.receitas_operacionais },
  { type: 'section', name: 'Deduções receita Bruta' },
  { type: 'calculated', key: 'receita_liquida', label: 'Receita Líquida',
    calc: (ctx) => ctx.receita_bruta - Math.abs(ctx.deducoes_receita) },
  { type: 'section', name: 'Custo com Pessoal' },
  { type: 'calculated', key: 'lucro_bruto', label: 'Lucro Bruto',
    calc: (ctx) => ctx.receita_liquida - ctx.custo_pessoal },
  { type: 'section', name: 'Despesas Fixas' },
  { type: 'section', name: 'Despesas Variáveis' },
  { type: 'section', name: 'Despesas Imobilizados' },
  { type: 'section', name: 'Despesas Financeiras' },
  { type: 'section', name: '( + ) Receita Financeira' },
  { type: 'section', name: 'Despesas Tributárias' },
  { type: 'section', name: 'Depesas c/ Parcelamentos' },
  { type: 'section', name: 'Despesas c/ Terc. de Serviços' },
  { type: 'calculated', key: 'lucro_operacional', label: 'Lucro/Prejuízo Operacional' },
  { type: 'section', name: 'Desepsas c/ Sócios' },
  { type: 'calculated', key: 'lucro_operacional_2', label: 'Lucro/Prejuízo Operacional (2)' },
  { type: 'calculated', key: 'despesas_receitas_nao_op', label: 'Despesas/Receitas não Operacionais' },
  { type: 'section', name: 'Empréstimos Recebidos PF/PJ' },
  { type: 'section', name: 'Despesas Empréstimos' },
  { type: 'calculated', key: 'lucro_liquido', label: 'Lucro/Prejuízo Líquido' },
];
```

Match por nome: `categories.find(c => !c.parent_id && c.name.toLowerCase().trim() === sectionName.toLowerCase().trim())`

Cálculo das linhas intermediárias (acumulativo, usando os totais previsto/realizado de cada seção macro processada).

Colunas `% Previsto` e `% Realizado`: calculadas como `valor / receitaLíquida * 100`.

**2. `DRE.tsx` — Renderização**

- **Painel Resumo** (topo): Cards com Receita Líquida, Custo c/ Pessoal, Despesas Operacionais, Receitas/Despesas não Operacionais, Lucro/Prejuízo Líquido + Fluxo de Caixa
- **Cabeçalho**: Mês/Ano dinâmico + Lucro/Prejuízo Médio Anual
- Linhas de **macro**: fundo verde claro, bold, expansíveis (accordion)
- Linhas de **sub-evento**: indentadas com ↳, ordenadas alfabeticamente
- Linhas **calculadas**: fundo escuro, bold, sem accordion
- **Colunas**: Evento Contábil | Previsto | Realizado | RXP | % Previsto | % Realizado
- Linha **Total Despesas %** após Receita Líquida

### Sem migration necessária

Nenhuma tabela ou coluna precisa ser alterada. O match é feito por nome do Evento Macro.

### Nenhuma alteração no Cadastro de Eventos

O `CategoryFormDialog.tsx` e `useCategories.ts` permanecem intactos. Os macros são cadastrados normalmente pelo usuário e a DRE os puxa automaticamente pela correspondência de nome.

### Resumo
- 0 migrations
- 0 alterações no cadastro de eventos
- 2 arquivos reescritos (`useDREData.ts`, `DRE.tsx`)
- Estrutura fixa com 15 macros + 7 linhas calculadas
- 2 colunas novas (% Previsto, % Realizado)
- Painel resumo no topo com KPIs

