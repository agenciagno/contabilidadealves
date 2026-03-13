

## Plano: Expandir Filtros na Aba de Lançamentos

### Resumo das Alterações

Tres mudanças no arquivo `src/pages/Transactions.tsx` e no hook `src/hooks/useServerTransactions.ts`:

---

### 1. Filtros Multi-Select nos Cabeçalhos "Valor" e "Recebido"

- Criar componente `NumericMultiFilter` seguindo a mesma estrutura visual do `ContactEventMultiFilter`: Popover com campo de busca, checkboxes, badge de contagem e botao "Limpar".
- Os valores unicos serao extraidos das transacoes da pagina atual (assim como `uniqueEventOptions`), formatados em BRL para exibicao.
- Novos campos em `ColumnFilters`: `amounts?: number[]` e `paidAmounts?: number[]`.
- Substituir os headers estaticos `<div className="text-right">Valor</div>` e `<div className="text-right">Recebido</div>` pelo novo componente.

### 2. Filtro Multi-Select para "Evento Contábil" na Toolbar

- Substituir o Popover simples de categorias (linhas 710-732) por um componente `CategoryMultiFilter`, estrutura identica ao `ContactEventMultiFilter`.
- Trocar `categoryFilter` (string unica) por `categoryFilters` (array de strings) no estado.
- Adaptar `serverFilters` para enviar array de category IDs.

### 3. Integração na Query Server-Side (`useServerTransactions.ts`)

- Adicionar novos campos no tipo `ServerFilters.columnFilters`: `amounts`, `paidAmounts`, `categoryIds`.
- Em `applyFilters`:
  - `categoryIds`: usar `.in('category_id', ids)` quando array tem itens.
  - `amounts`: usar `.in('amount', values)` para filtrar valores exatos.
  - `paidAmounts`: usar `.in('paid_amount', values)` para filtrar valores recebidos exatos.
- Remover o filtro singular `categoryId` e usar o novo array.

### Arquivos Alterados

| Arquivo | Tipo de Mudança |
|---|---|
| `src/pages/Transactions.tsx` | Novos componentes de filtro, estado e integracao |
| `src/hooks/useServerTransactions.ts` | Novos campos em ServerFilters, logica de query |

### Detalhes Técnicos

- O componente `NumericMultiFilter` usa `useState` local + `useRef` pattern (igual ao `ContactEventMultiFilter`) para evitar fechamento do Popover durante selecao.
- Valores numericos sao comparados como `number` mas exibidos formatados como moeda.
- O filtro de categorias multi-select usa `Checkbox` do Radix, busca por texto e exibe cor da categoria.
- Nenhuma migration de banco necessaria — apenas filtragem com operadores existentes do Supabase.

