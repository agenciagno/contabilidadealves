## Plano: Aba "Pagar / Receber" com modos "Todas as transações" e "Consulta Mensal"

### 1. Toggle no topo da página
Em `src/pages/PagarReceber.tsx`, adicionar um `ToggleGroup` (shadcn) com duas opções:
- **Todas as transações** (default) — renderiza o `<CashFlowTab />` atual, sem alterações.
- **Consulta Mensal** — renderiza um novo componente `<MonthlyConsultTab />`.

Estado controlado via `useState<'all' | 'monthly'>('all')`. Nada na lógica do `CashFlowTab` é alterado.

### 2. Novo componente `MonthlyConsultTab`
Arquivo: `src/components/transactions/MonthlyConsultTab.tsx`.

**Filtros (linha superior):**
- Botões de **Ano**: derivados dinamicamente a partir das transações existentes (anos com `expected_date` ou `date`), ordenados desc. Ano atual selecionado por padrão.
- Botões de **Mês**: 12 botões (Jan–Dez). Mês atual selecionado por padrão. Botão extra "Ano todo" para visão consolidada.
- Dropdown de **Evento Contábil** (mesmo padrão `EventoMultiFilter` ou `Select` simples já usado): filtra por macro/sub evento. Default = "Todos".

Clique em qualquer botão recalcula instantaneamente (estado local + `useMemo`).

### 3. Lógica de dados
**Fonte:** as `transactions` já carregadas pelo hook `useTransactions` (passadas via prop, idêntico ao `CashFlowTab`). Sem novas queries no Supabase.

**Regra de período (Histórico Realizado):**
- Para meses **anteriores ao mês atual** do ano atual (e qualquer mês de anos passados): usar **Valor Realizado** = soma de `paid_amount ?? amount` apenas de transações com `isEffectivelyPaid` = true (usando `src/lib/financial-utils.ts`), filtradas por `date` (data de pagamento) dentro do mês.
- Para o **mês atual** e **meses futuros**: usar **Valor Previsto** = soma de `amount` de todas transações (independente de status) com `expected_date` dentro do mês.

**Agrupamento:** por Evento Contábil (categoria). Sub-eventos agrupados sob seu macro (parent), seguindo a hierarquia já existente.

**Estrutura da tabela:**

```text
| Evento Contábil          | A Receber  | A Pagar    | Status     |
|--------------------------|-----------:|-----------:|------------|
| ▸ Receitas Operacionais  |  R$ 12.000 |          – | Realizado  |
|   ↳ Honorários           |  R$ 10.000 |          – | Realizado  |
|   ↳ Outros               |   R$ 2.000 |          – | Realizado  |
| ▸ Despesas Fixas         |          – |  R$ 4.500  | Previsto   |
| ...                      |            |            |            |
| TOTAL                    |  R$ 12.000 |  R$ 4.500  |            |
```

- Coluna **Status** indica se a linha veio de "Realizado" (pago/recebido) ou "Previsto".
- **Total do Ano** por evento: rodapé extra ou coluna adicional "Total Ano" calculando o somatório de todos os 12 meses (aplicando a mesma regra histórico/previsto mês a mês).

### 4. Estilo visual
- Layout limpo, mesma estética dos cards/tabelas atuais (`Card`, `Table` shadcn, fonte Inter, cantos `rounded-xl`).
- Botões de Ano/Mês: `ToggleGroup` ou `Button` com variantes `default` (selecionado) e `outline` (não selecionado). Wrap responsivo.
- **Cores dos valores:**
  - Linhas **Previstas** (mês atual/futuro): cor neutra (`text-foreground` / `text-muted-foreground`).
  - Linhas **Realizadas** (meses passados):
    - Receitas confirmadas: verde (`text-emerald-600` — token de receita já usado no projeto).
    - Despesas pagas: vermelho (`text-rose-600` — token de despesa).
- Badge sutil "Realizado" / "Previsto" ao lado do valor para reforçar a leitura.

### 5. Performance
- Toda agregação em `useMemo` indexada por `[transactions, year, month, eventFilter]`.
- Sem refetch ao trocar mês/ano — dados já estão em memória.
- Pré-computar `Map<categoryId, Category>` e `Map<categoryId, totalsPorMes>` uma vez por ano selecionado para o cálculo do "Total do Ano".

### Arquivos afetados
- **Editado:** `src/pages/PagarReceber.tsx` — adicionar Toggle e renderização condicional.
- **Novo:** `src/components/transactions/MonthlyConsultTab.tsx` — toda a UI/lógica da Consulta Mensal.

### Garantias
- **Nenhuma** alteração em `CashFlowTab`, hooks, queries, schema ou regras de negócio existentes.
- **Nenhuma** migration. Reutiliza dados já carregados.
- Filtro de bancos invisíveis preservado (já filtrados em `PagarReceber.tsx` antes de passar `transactions`).
