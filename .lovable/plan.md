

## Plano: Correções e Melhorias na Aba "Pagar e Receber" e Relatório PDF

### 1. Filtro estrito de exibição (CashFlowTab.tsx)

Na linha 449, onde filtra `!t.is_paid`, adicionar condição extra: transação deve ter `expected_date` não nulo.

```
result = transactions.filter(t => !t.is_paid && t.expected_date);
```

Isso garante que apenas transações pendentes/vencidas COM Data Prevista apareçam.

### 2. Filtro no cabeçalho "A Pagar" (CashFlowTab.tsx)

Adicionar novo estado `despesaFilterAmounts` (similar ao `amounts` para receitas). Na coluna "A Pagar" (linha 754-756), substituir o `<span>` estático pelo componente `NumericMultiFilter` usando `despesaAmounts` como valores. Adicionar filtro no pipeline de filtragem para despesas selecionadas.

Atualizar `CashFlowColumnFilters` para incluir `despesaAmounts?: number[]` e aplicar filtro no useMemo.

### 3. Refatoração do Relatório PDF (CashFlowReportModal.tsx)

**Cards no PDF**: Substituir os 3 cards atuais (Entradas Pendentes, Saídas Pendentes, Saldo Projetado) por 4 cards: **Capital de Giro**, **Entradas**, **Saídas**, **Saldos Atuais (Bancos)**. Calcular running balance no modal para obter Capital de Giro (saldo da última linha).

**Colunas da tabela no PDF**: Alterar para 9 colunas nesta ordem exata:
`PREVISTA | CLIENTE | RECEBER | PAGAR | VENCIMENTO | EVENTO | HISTÓRICO | SALDO ATUAL | STATUS`

Calcular running balance dentro do modal para popular a coluna "Saldo Atual" no PDF.

**Preview do resumo**: Atualizar para mostrar os mesmos 4 cards da tela principal.

**Filtro no modal**: Usar `expected_date` como campo de data principal (consistente com a regra de exibição).

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Filtro `expected_date` obrigatório, filtro "A Pagar" com NumericMultiFilter, novo estado `despesaAmounts` |
| `src/components/transactions/CashFlowReportModal.tsx` | 4 cards (Capital de Giro, Entradas, Saídas, Saldos Atuais), 9 colunas com running balance e histórico, preview atualizado |

