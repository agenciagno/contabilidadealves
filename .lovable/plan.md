# Plano — Calendário Fiscal

Exceção autorizada ao reskin. Schema (view `fiscal_calendar_effective`, tabelas `fiscal_obligations_catalog`, `fiscal_calendar` + colunas de override), Edge Function `calculate-fiscal-calendar` e RPC `generate_monthly_fiscal_tasks` serão criados manualmente por você. Aqui só implemento frontend + chamadas.

## Pré-requisitos que você confirma antes de eu rodar

Para a tipagem (`types.ts` é auto-gerado, então usarei `as any` nas chamadas até o schema existir):

- **View `fiscal_calendar_effective`** expõe: `id` (= fiscal_calendar.id), `obligation_id`, `company_id`, `year`, `month`, `adjusted_due_date`, `internal_delivery_date`, `adjusted_due_date_override`, `internal_delivery_date_override`, `override_reason`, `overridden_at`, `overridden_by`.
- **`fiscal_obligations_catalog`**: `id`, `name`, `code`, `applies_to` (text[]).
- **`fiscal_calendar`**: editável via UPDATE direto (com RLS por `company_id`) nas colunas `adjusted_due_date_override`, `internal_delivery_date_override`, `override_reason`, `overridden_at`, `overridden_by`.
- **RPC** `generate_monthly_fiscal_tasks(p_year int, p_month int)` retorna `{ tasks_created: number }`.
- **Edge function** `calculate-fiscal-calendar` aceita `POST { year, month }`.

Se algum nome divergir, ajusto antes de codar.

## Arquivos a criar

```text
src/hooks/useFiscalCalendar.ts        // queries + mutations (TanStack Query)
src/pages/FiscalCalendar.tsx          // página
src/components/fiscal/FiscalObligationOverrideDialog.tsx  // modal de override
```

## Arquivos a editar

- `src/App.tsx` — registrar rota `/fiscal/calendario` envolvida em `ModuleGuard moduleName="fiscal"` + guarda local que redireciona se `!isAdmin && !isSuperAdmin`.
- `src/components/layout/AppSidebar.tsx` — adicionar item "Calendário Fiscal" (ícone `CalendarDays`) dentro do grupo Fiscal, abaixo de "Tarefas", **renderizado apenas se** `isAdmin || isSuperAdmin`.

## Comportamento

### Cabeçalho
- Título "Calendário Fiscal".
- 2 `Select` (Mês 01–12 com nomes em PT, Ano 2025–2027), default = atual.
- Botão primário "⚡ Gerar Tarefas do Mês" à direita.

### Tabela (Card + shadcn Table)
- Query: `supabase.from('fiscal_calendar_effective').select('*, fiscal_obligations_catalog!inner(name, code, applies_to)').eq('year', year).eq('month', month).order('adjusted_due_date')`.
- Loading: skeleton nas linhas. Vazio: "Nenhuma obrigação encontrada para o período".
- Colunas conforme especificado. Regime renderizado como `Badge` por item do array. Override badge: amarelo se `adjusted_due_date_override` não-nulo, verde "Automático" caso contrário. Ação: `Button variant="ghost" size="icon"` com `Pencil`.

### Botão "Gerar Tarefas"
- Mutation sequencial:
  1. `fetch(${VITE_SUPABASE_URL}/functions/v1/calculate-fiscal-calendar, POST, body {year, month}, header Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY})`.
  2. `supabase.rpc('generate_monthly_fiscal_tasks', { p_year, p_month })`.
- Toasts (sonner): sucesso `✅ {tasks_created} tarefas geradas para MM/YYYY`; zero → `ℹ️ Todas as tarefas deste mês já foram geradas`; erro → `toast.error(err.message)`.
- Invalida query `['fiscal-calendar', year, month]` e `['fiscal-tasks']`.
- Durante execução: `Loader2` + texto "Gerando..." e `disabled`.

### Modal de override
- `Dialog` shadcn, `max-h-[90vh]` com scroll interno (memória Global Modals).
- Bloco read-only cinza com datas calculadas.
- Dois `Popover + Calendar` (padrão shadcn-datepicker) — cada um permite limpar via botão "Limpar".
- `Textarea` motivo. Validação: se algum override preenchido, motivo obrigatório → desabilita "Salvar Ajuste".
- "Salvar": `update` em `fiscal_calendar` por `id` setando os 3 campos + `overridden_at: new Date().toISOString()` + `overridden_by: profile.id` (lido via `useAuth().user.id` resolvido para `profiles.id` por `useUserRole`/`useProfile`).
- "Remover Ajuste": visível só se override existe; seta os 5 campos como `null`.
- Pós-sucesso: fechar, toast, invalidar query.

## Controle de acesso

- Sidebar: item oculto para `colaborador`.
- Rota: `<ModuleGuard moduleName="fiscal">` + componente interno que faz `if (!isAdmin && !isSuperAdmin) return <Navigate to="/fiscal/tarefas" replace/>`.

## Notas técnicas

- TanStack Query keys: `['fiscal-calendar', year, month]`.
- Tipagem: como `types.ts` é regenerado pelo Supabase, uso interfaces locais e `from('fiscal_calendar_effective' as any)` para não quebrar build até o schema existir.
- Sem alterações em outras rotas, hooks ou componentes.
