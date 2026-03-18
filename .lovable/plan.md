

## Plano: Opção "(Vazio)" nos Filtros da Aba Pagar/Receber

A filtragem nesta tela é **client-side** (useMemo sobre o array `transactions`). A constante sentinela `IS_EMPTY_OR_NULL` será usada internamente para representar campos nulos/vazios.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Adicionar opção "(Vazio)" em EventoMultiFilter, NumericMultiFilter, DateColumnFilter; atualizar lógica de filtragem com OR |

### Constante sentinela

```ts
const IS_EMPTY = '__IS_EMPTY_OR_NULL__';
```

### 1. EventoMultiFilter (Evento Contábil)

- Injetar opção estática "(Vazio)" no topo da lista (antes das categorias reais), com valor `IS_EMPTY`.
- No pipeline de filtragem (`finalFiltered`), quando `categoryFilterIds` contém `IS_EMPTY`:
  - Se contém apenas `IS_EMPTY`: filtrar `t.category_id == null`
  - Se contém `IS_EMPTY` + outros IDs: `.filter(t => t.category_id == null || categoryFilterIds.includes(t.category_id))` (OR)

### 2. NumericMultiFilter (A Receber / A Pagar)

- Injetar opção "(Vazio)" no topo da lista de valores.
- Usar valor sentinela numérico especial: `-999999.99` ou melhor, mudar o tipo de `number[]` para `(number | string)[]` e usar string `IS_EMPTY`.
- Na filtragem de amounts/despesaAmounts:
  - Se inclui `IS_EMPTY`: incluir linhas onde o valor da coluna correspondente é nulo (receita sem amount ou despesa sem amount — raro mas coberto).
  - Combinar com OR: `amount in selected_values OR amount is null`.

### 3. DateColumnFilter (Data Prevista / Vencimento)

- Adicionar checkbox "(Vazio)" dentro do popover do DateColumnFilter, abaixo dos inputs de data.
- Novo campo no `CashFlowColumnFilters`: `expected_date_empty?: boolean`, `due_date_empty?: boolean`.
- Na filtragem:
  - Se `expected_date_empty` e tem range: `t.expected_date == null || (t.expected_date >= start && t.expected_date <= end)` (OR)
  - Se `expected_date_empty` sem range: `t.expected_date == null`

### 4. ContactEventMultiFilter (Cliente/Fornecedor)

- Injetar opção "(Vazio)" no topo para filtrar transações sem contato E sem descrição de evento.
- Quando selecionado: incluir `t.contact_id == null && !t.description` ou simplesmente `t.contact_id == null`.
- OR com outros contatos selecionados.

### 5. Atualização do CashFlowColumnFilters

```ts
interface CashFlowColumnFilters {
  expected_date?: { start: string; end: string };
  expected_date_empty?: boolean;
  due_date?: { start: string; end: string };
  due_date_empty?: boolean;
  contactIds?: string[];    // pode incluir IS_EMPTY
  eventNames?: string[];
  amounts?: (number | string)[];     // pode incluir IS_EMPTY
  despesaAmounts?: (number | string)[];
  status?: string[];
}
```

### 6. Lógica de filtragem (useMemo)

Para cada filtro com possível "(Vazio)", a lógica segue o padrão OR:

```ts
// Exemplo: category filter
if (categoryFilterIds.length) {
  const includeEmpty = categoryFilterIds.includes(IS_EMPTY);
  const realIds = categoryFilterIds.filter(id => id !== IS_EMPTY);
  result = result.filter(t => {
    if (includeEmpty && !t.category_id) return true;
    if (realIds.length && t.category_id && realIds.includes(t.category_id)) return true;
    return false;
  });
}
```

Mesmo padrão aplicado a: amounts, despesaAmounts, contactIds, datas.

