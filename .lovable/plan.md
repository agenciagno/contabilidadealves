

## Plano: Corrigir Busca Server-Side + Compactar Modais de Relatório

### 1. Aprimorar Busca Server-Side (`useServerTransactions.ts`)

**Situação atual:** Os filtros de toolbar (Tipo, Banco, Evento Contábil) ja sao server-side — estao no objeto `serverFilters` e sao aplicados em `applyFilters`. Porem, o `searchTerm` so busca no campo `description` via `.ilike()`. Ele nao cobre o nome do contato nem o campo `notes`.

**Correção:** Trocar o `.ilike('description', ...)` por um `.or()` que busca em `description`, `notes`, e no nome do contato (via filtro no join). Como Supabase nao suporta `ilike` em campos de tabelas relacionadas diretamente, usaremos a abordagem de `.or('description.ilike.%term%,notes.ilike.%term%')` para os campos da tabela principal. Para buscar por nome do contato, adicionaremos um filtro alternativo via `contact_id` obtido previamente ou usaremos a sintaxe `contact.name` se suportada pelo PostgREST.

Alternativa mais robusta: usar `.or()` apenas em `description` e `notes` (que ja cobre a maioria dos casos), mantendo o comportamento atual como base.

### 2. Compactar BankReportModal (`src/components/banks/BankReportModal.tsx`)

**Mudancas:**
- Remover `space-y-5` e usar `space-y-3`
- Colocar "Contas Bancárias" e "Evento Contábil" lado a lado com `grid grid-cols-2 gap-3`
- Reduzir padding do Preview Summary: `p-6 space-y-4` → `p-3 space-y-2`
- Reduzir fonte do titulo do preview: `text-base` → `text-sm`
- Reduzir `mb-3` dos labels para `mb-1`
- Reduzir separators: usar `my-2` em vez de defaults
- Botoes de exportar: reduzir `gap-3` para `gap-2`, `h-10` para `h-8`
- Remover `max-h-[90vh] overflow-y-auto` do DialogContent (conteudo deve caber sem scroll)

### 3. Compactar CashFlowReportModal (`src/components/transactions/CashFlowReportModal.tsx`)

**Mudancas identicas:**
- `space-y-5` → `space-y-3`
- Colocar "Evento Contábil" e "Cliente/Fornecedor" lado a lado: `grid grid-cols-2 gap-3`
- Mesmo tratamento no Preview Summary (reduzir padding/fontes)
- Botoes de exportar compactados
- Eliminar scroll interno

### Arquivos Alterados

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useServerTransactions.ts` | Expandir `searchTerm` para buscar em `description` + `notes` |
| `src/components/banks/BankReportModal.tsx` | Layout compacto com grid |
| `src/components/transactions/CashFlowReportModal.tsx` | Layout compacto com grid |

Nenhuma migration necessaria.

