

## Plano: Adicionar flag `show_in_dre` aos Eventos Contábeis

### 1. Migration — Nova coluna `show_in_dre`

```sql
ALTER TABLE categories ADD COLUMN show_in_dre boolean NOT NULL DEFAULT true;
```

### 2. `src/hooks/useCategories.ts` — Expor `show_in_dre`

- Adicionar `show_in_dre: boolean` à interface `Category`

### 3. `src/components/categories/CategoryFormDialog.tsx` — Toggle na UI

- Adicionar estado `showInDre` (default `true`, inicializado do `category.show_in_dre` na edição)
- Adicionar um `Switch` com label "Exibir na DRE?" e texto de ajuda abaixo
- Incluir `show_in_dre` no payload do `onSubmit`

### 4. `src/hooks/useDREData.ts` — Filtrar categorias com `show_in_dre = false`

Na lógica de `buildSection`, ao buscar macros e sub-eventos, ignorar categorias onde `show_in_dre === false`. Isso filtra automaticamente tanto Previsto quanto Realizado, pois ambos usam `sumPrevisto(catId)` e `sumRealizado(catId)` que dependem do `category_id`.

**Abordagem**: no `findMacro` e `getSubEvents`, filtrar apenas categorias com `show_in_dre !== false`. Nenhuma mudança nas queries SQL do Supabase (o filtro é client-side via categorias já carregadas).

### Proteção Global

- **Dashboard e Saldos Bancários**: não são alterados — usam `transactions` diretamente sem passar por categorias/DRE
- **Trigger `update_bank_balance`**: não é alterada — continua somando todas as transações liquidadas

### Resumo

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | Migration SQL | Nova coluna |
| 2 | `src/hooks/useCategories.ts` | Interface |
| 3 | `src/components/categories/CategoryFormDialog.tsx` | Toggle UI |
| 4 | `src/hooks/useDREData.ts` | Filtro client-side |

- 1 migration
- 3 arquivos editados
- 0 impacto em saldos/dashboard

