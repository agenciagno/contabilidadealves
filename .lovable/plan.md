## 1. Concilação retornando vazio — corrigir + ampliar

### O bug
Hoje a Conciliação só busca transações com **`expected_date` dentro do período**. Isso deixa de fora:
- Transações **À Vista** pagas no período (têm `expected_date = NULL` desde a última mudança).
- Transações pagas no período cuja Data Prevista caiu em outro mês — elas compõem o Realizado da DRE mas não aparecem na Conciliação atual.

Resultado: períodos com 244 lançamentos mostram "Nenhuma transação no período" porque nenhum bate exatamente na regra estreita.

### O que muda (só na Conciliação — DRE e Pagar/Receber intocados)

**Query**: passa a buscar transações onde **`expected_date` OU `date` (pagamento) caia no período**:

```ts
.or(`and(expected_date.gte.${start},expected_date.lte.${end}),and(date.gte.${start},date.lte.${end},is_paid.eq.true)`)
```

Mantém `deleted_at is null`. Scoping de `company_id` já vem da RLS.

**Classificação por linha** (nova coluna lógica, exibida nos detalhes do grupo):
- `Previsto` → tem `expected_date` no período (pago ou não).
- `Realizado fora do Previsto` → pago no período mas `expected_date` fora ou null (caso típico de À Vista).
- `Ambos` → `expected_date` e `date` no período.

**Totalizadores por macro-evento** (linha principal da tabela):
- `Previsto DRE` (inalterado conceitualmente — só conta linhas com `expected_date` no período).
- `Em Aberto`, `Pagas c/ Prevista`, `À Vista`, `Diferença` (inalterados).
- **Nova coluna**: `Realizado fora do Previsto` — soma das transações pagas no período sem `expected_date` no período. Ajuda a explicar por que o Realizado da DRE pode divergir do Previsto.

**Nenhum cálculo da DRE muda.** A Conciliação passa a ser um diagnóstico mais amplo, mas as regras da DRE (`useDREData`) continuam idênticas.

---

## 2. Filtros nos cabeçalhos das colunas (padrão Lançamentos)

Hoje a Conciliação tem uma barra de Selects acima da tabela. Vou substituir por **filtros nos próprios cabeçalhos**, replicando o padrão e os componentes já usados em `Transactions.tsx` (popover com ícone de funil, ordenação, opção `(Vazio)`, intervalo numérico/data e seleção múltipla).

### Tabela principal (linhas por Evento Contábil macro)

| Coluna | Filtro |
|---|---|
| Evento Contábil | Texto + multi-seleção de eventos (igual filtro de "Evento Contábil" em Lançamentos) + (Vazio) |
| Previsto DRE | Intervalo numérico (de/até) + ordenação asc/desc |
| Em Aberto | Intervalo numérico + ordenação |
| Pagas c/ Prevista | Intervalo numérico + ordenação |
| À Vista | Intervalo numérico + ordenação |
| Realizado fora do Previsto *(nova)* | Intervalo numérico + ordenação |
| Diferença | Intervalo numérico + ordenação |

### Tabela de detalhe (ao expandir um grupo)

| Coluna | Filtro |
|---|---|
| Data Prevista | Intervalo de datas + (Vazio) + ordenação |
| Data Pagto. | Intervalo de datas + (Vazio) + ordenação |
| Cliente/Fornecedor | Multi-seleção + (Vazio) |
| Evento Contábil (sub) | Multi-seleção + (Vazio) |
| Conta Corrente | Multi-seleção + (Vazio) |
| Valor | Intervalo numérico + ordenação |
| Status | Multi-seleção (Pago, Em aberto, À Vista) |

### Regras
- Componentes reaproveitados do `Transactions.tsx`: `DateColumnFilter`, ColumnFilter popovers, `ArrowUpDown`/`Filter` icons, `(Vazio)`.
- Combinação **AND** entre filtros, como em Lançamentos.
- Filtros do detalhe **propagam para os totais** do grupo e gerais (mesma lógica atual).
- Botão "Limpar filtros" continua no topo, agora atuando sobre todos os filtros de coluna.
- A busca textual e o filtro de período do modal continuam onde estão (não são por coluna).

---

## Arquivos a alterar

- `src/components/reports/DREConciliationModal.tsx` — query ampliada (or de `expected_date`/`date`), classificação por linha, nova coluna "Realizado fora do Previsto", substituição da barra de Selects por filtros nos cabeçalhos das colunas (padrão Lançamentos).

Não mexe em: `useDREData`, `DRE.tsx`, `PagarReceber.tsx`, schema, RLS, fórmulas, qualquer outro relatório.

Posso seguir?