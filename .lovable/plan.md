

## Plano: Opção "(Vazio)" nos Filtros da Página Lançamentos

A página Lançamentos usa filtros server-side (Supabase query em `useServerTransactions`). A lógica precisa tratar o sentinela `IS_EMPTY` tanto na UI quanto na query.

### Constante

```ts
const IS_EMPTY = '__IS_EMPTY_OR_NULL__';
```

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/Transactions.tsx` | Injetar "(Vazio)" nos filtros de toolbar (Banco, Evento Contábil, Tipo) e nos filtros de cabeçalho (DateColumnFilter, NumericMultiFilter, ContactEventMultiFilter) |
| `src/hooks/useServerTransactions.ts` | Tratar sentinela `IS_EMPTY` na função `applyFilters` com `.is('col', null)` e `.or()` para combinar com valores reais |

### 1. Toolbar — Banco (single-select → multi-select)

Converter `bankFilter` de `string` para `string[]` para suportar seleção de "(Vazio)" + bancos reais simultaneamente. Adicionar opção "(Vazio)" no topo da lista. Na query server-side, quando `IS_EMPTY` estiver no array: `.or('bank_id.in.(ids),bank_id.is.null')`.

Alternativa mais simples: manter single-select mas adicionar "(Vazio)" como opção que filtra `bank_id.is.null`. Quando selecionado, `bankId = IS_EMPTY`.

### 2. Toolbar — Evento Contábil (CategoryMultiFilter)

Injetar opção "(Vazio)" no topo da lista de categorias. Na query: quando `IS_EMPTY` está em `categoryIds`, usar `.or('category_id.in.(realIds),category_id.is.null')`.

### 3. Toolbar — Tipo (single-select)

Adicionar opção "(Vazio)" no popover de Tipo. Quando selecionado, filtrar `type.is.null` ou `type.eq.''` na query.

### 4. Header — DateColumnFilter

Adicionar checkbox "(Vazio)" no popover. Novos campos no `ColumnFilters`: `issue_date_empty`, `due_date_empty`, `expected_date_empty`, `date_empty`. Na query: `.or('due_date.gte.start,due_date.is.null')` quando empty + range.

### 5. Header — NumericMultiFilter (Valor / Recebido)

Injetar "(Vazio)" no topo. Mudar tipo de `number[]` para `(number | string)[]`. Na query: `.or('amount.in.(vals),amount.is.null')`.

### 6. Header — ContactEventMultiFilter

Injetar "(Vazio)" para filtrar transações sem contato. Na query: adicionar `contact_id.is.null` ao OR existente.

### 7. Server-side (`applyFilters` em `useServerTransactions.ts`)

Atualizar `ServerFilters` interface para suportar:
- `bankId: string | string[]` ou novo campo `bankIds`
- Campos `*_empty: boolean` para datas
- `amounts` e `paidAmounts` como `(number | string)[]`

Para cada filtro, implementar a lógica OR com `.or()`:
```ts
// Exemplo: categoryIds com IS_EMPTY
const hasEmpty = categoryIds.includes(IS_EMPTY);
const realIds = categoryIds.filter(id => id !== IS_EMPTY);
if (hasEmpty && realIds.length) {
  query = query.or(`category_id.in.(${realIds.join(',')}),category_id.is.null`);
} else if (hasEmpty) {
  query = query.is('category_id', null);
} else {
  query = query.in('category_id', realIds);
}
```

