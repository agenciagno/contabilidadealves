

## Plano: Paginação Server-Side e Filtros no Backend para Lançamentos

### Análise de Impacto

O hook `useTransactions` é consumido por **13 arquivos** (Dashboard, Home, PagarReceber, RecurringBills, HeaderCalendar, etc.). Alterar diretamente esse hook quebraria todas essas páginas. A estratégia é **criar um novo hook dedicado** para a página de Lançamentos e manter o hook existente intacto.

---

### BLOCO 1 + 2: Novo hook `useServerTransactions` com paginação + filtros server-side

**Novo arquivo:** `src/hooks/useServerTransactions.ts`

- Aceita como parâmetros: `page`, `pageSize` (99), e todos os filtros (type, categoryId, bankId, searchTerm, columnFilters com datas, contactIds, eventNames, status, sortField, sortOrder).
- Monta a query Supabase aplicando filtros **antes** do `.range()`:
  - `.eq('type', ...)`, `.eq('category_id', ...)`, `.eq('bank_id', ...)`
  - `.gte('due_date', start)`, `.lte('due_date', end)` para filtros de data
  - `.in('contact_id', [...])` para multi-select de contatos
  - `.ilike('description', '%termo%')` para busca textual
  - `.eq('is_paid', true/false)` para status (com lógica `isEffectivelyPaid` aplicada defensivamente no frontend para os edge cases de `date`/`paid_amount` nulos)
- Usa `.select('*,category:categories(...),bank:banks(...),contact:contacts(...)', { count: 'exact' })` para obter o count total.
- Aplica `.range(from, to)` ao final.
- Retorna `{ data: Transaction[], count: number, isLoading, isFetching }`.
- `queryKey` inclui todos os parâmetros de filtro + página para cache granular.

**Observação sobre `eventNames` (transações sem contato):** Como esse filtro envolve `contact_id IS NULL AND description IN (...)`, será composto com `.is('contact_id', null).in('description', [...])`. Se houver contactIds E eventNames simultaneamente, será necessário usar `.or(...)` para combinar as condições.

---

### BLOCO 3: Query independente para KPIs

**No mesmo hook ou função separada:** `useTransactionKPIs`

- Query separada que aplica os **mesmos filtros** da tela (tipo, categoria, banco, busca, datas, contatos), mas **sem** `.range()`.
- Busca apenas colunas necessárias: `id, type, amount, paid_amount, is_paid, date, due_date` (sem joins) para minimizar payload.
- Calcula os totais no frontend (receitasPagas, receitasPendentes, despesasPagas, despesasPendentes, em atraso, capital de giro).
- `queryKey` separada: `['transaction-kpis', ...filtros]`.

**Alternativa mais performática (futuro):** criar uma database function `get_transaction_kpis(filters)` que retorna os agregados via SQL. Por ora, a query leve sem joins é suficiente.

---

### BLOCO 4: UX — Loading States e Paginação

**Em `src/pages/Transactions.tsx`:**

1. Substituir `useTransactions()` por `useServerTransactions(...)` + `useTransactionKPIs(...)`.
2. Adicionar estado `currentPage` (default 1). Resetar para 1 quando qualquer filtro mudar.
3. No rodapé da tabela, renderizar controles de paginação:
   - "< Anterior" / "Próxima >"
   - Números de página (com ellipsis para ranges grandes)
   - Indicador "Página X de Y" e "Z transações no total"
4. Durante `isFetching` (transição entre páginas), exibir Skeleton rows (10 linhas fantasma) no corpo da tabela ao invés de congelar.
5. O checkbox "selecionar todos" opera apenas na página visível (99 itens).
6. Manter `useTransactions()` original apenas para BI metrics (biMetrics) que precisam de dados globais, OU migrar biMetrics para o hook de KPIs.

---

### Arquivos impactados

| Arquivo | Ação |
|---|---|
| `src/hooks/useServerTransactions.ts` | **Novo** — hook com paginação + filtros server-side |
| `src/pages/Transactions.tsx` | Refatorar para usar novo hook, adicionar paginação UI e skeleton |
| `src/hooks/useTransactions.ts` | **Sem alteração** — mantém compatibilidade com outras páginas |

### Riscos mitigados

- **Outras páginas não são afetadas** pois `useTransactions` permanece intacto.
- **Filtros persistem** entre páginas pois fazem parte da queryKey.
- **KPIs são precisos** pois usam query independente sem paginação.
- **Select All** opera apenas na página visível, evitando operações em milhares de registros.

