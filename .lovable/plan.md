

## Plano: Refatoração da Aba "Pagar e Receber"

Este plano cobre 6 mudanças: novas colunas, running balance, KPI atualizado, filtros de cabeçalho, filtro de data global, e modal de relatório com herança de estado + impressão.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Reescrita quase total: novas colunas, filtros de cabeçalho, filtro de data global, KPI dinâmico |
| `src/components/transactions/CashFlowReportModal.tsx` | Herança de filtros via props, botão limpar datas, CSS @media print |
| `src/pages/PagarReceber.tsx` | Menor — passa dados extras se necessário |
| `src/index.css` | Adicionar regras `@media print` globais |

### 1. Novas Colunas e Reordenação

Remover coluna "Valor". Criar duas colunas: **A Receber** (mostra valor apenas se `type === 'receita'`, senão `—`) e **A Pagar** (mostra valor apenas se `type === 'despesa'`, senão `—`).

Ordem final: `Data Prevista | Cliente/Fornecedor | A Receber | A Pagar | Vencimento | Evento Contábil | Histórico | Saldo Atual | Status | Dia da Semana`

### 2. Running Balance (Saldo Atual)

Lógica no `useMemo` de `rows`:
```
Linha 1: saldo = totalBankBalance + aReceber(1) - aPagar(1)
Linha N: saldo = saldoAnterior + aReceber(N) - aPagar(N)
```
O cálculo opera sobre as linhas **já filtradas** (respeitando todos os filtros ativos incluindo data, contato, evento).

### 3. Card Capital de Giro

- Remover o texto "Até hoje: ..."
- O valor principal = `saldoAtual` da **última linha** renderizada na tabela (ou `totalBankBalance` se tabela vazia)

### 4. Filtros de Cabeçalho (Multi-select)

Replicar os componentes inline já existentes em `Transactions.tsx`:
- **Data Prevista / Vencimento**: `DateColumnFilter` com range + sort (copiar componente)
- **Cliente/Fornecedor**: `ContactEventMultiFilter` com busca e checkboxes multi-select
- **A Receber / A Pagar**: `NumericMultiFilter` com busca por valor
- **Evento Contábil**: Multi-select com checkboxes e busca
- **Status**: Filtro simples (Pendente/Vencido)
- **Dia da Semana / Histórico**: Sem filtro (apenas texto)

Header fixo: `TableHeader className="sticky top-0 z-10 bg-card"`

Estado local `ColumnFilters` com campos: `expected_date`, `due_date`, `contactIds`, `eventNames`, `amounts`, `status`.

### 5. Filtro de Data Global (Barra Superior)

Adicionar acima da tabela um bloco com dois inputs `type="date"`:
- **Padrão**: `startDate = 01/01/{anoCorrente}`, `endDate = hoje`
- Filtra transações por `expected_date || due_date || issue_date` dentro do range
- Integra-se ao pipeline de filtragem antes dos filtros de cabeçalho

### 6. Modal "Gerar Relatório" — Herança + Impressão

**Herança de Estado**: Passar `initialStartDate`, `initialEndDate`, `initialCategoryId`, `initialContactId` como props ao `CashFlowReportModal`. Usar esses valores como estado inicial dos `useState` internos do modal.

**Botão de Limpeza Rápida**: Adicionar ícone `X` ao lado do campo de Data no modal. Ao clicar, limpa `startDate` e `endDate` para strings vazias → relatório mostra acumulado geral.

**Layout de Impressão** (`src/index.css`):
```css
@media print {
  @page { size: landscape; margin: 10mm; }
  .sidebar, nav, .no-print, button { display: none !important; }
  body { background: white !important; }
  * { color-adjust: exact; -webkit-print-color-adjust: exact; }
}
```
Adicionar botão "Imprimir" no modal que chama `window.print()`. O `summaryRef` e a tabela de preview do modal ficam visíveis na impressão.

### Fluxo de dados simplificado

```text
PagarReceber (page)
  └── CashFlowTab (component)
        ├── [State] globalDateRange (01/01/ano ~ hoje)
        ├── [State] columnFilters (multi-select headers)
        ├── [Memo] filtered = transactions
        │     .filter(!is_paid)
        │     .filter(globalDateRange)
        │     .filter(columnFilters)
        │     .sort(sortField, sortOrder)
        ├── [Memo] rows = filtered.map(running balance)
        ├── [Memo] lastRowBalance → Capital de Giro KPI
        ├── KPI Cards (4)
        ├── Table (sticky header + filters)
        └── CashFlowReportModal (herda filtros ativos)
```

