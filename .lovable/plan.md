# Plano — Dashboard Fiscal

Nova página `/fiscal/dashboard`, exceção autorizada ao reskin. Assumo o schema estendido em `fiscal_tasks` (`competence_year`, `competence_month`, `fiscal_due_date`) e nos status (`'concluido' | 'pendente' | 'em_andamento'`) já configurado por você. Se algum nome divergir, ajusto antes de codar.

## Arquivos a criar

```text
src/hooks/useFiscalDashboard.ts        // todas as queries do dashboard
src/pages/FiscalDashboard.tsx          // página
```

## Arquivos a editar

- `src/App.tsx` — registrar rota `/fiscal/dashboard` com `ModuleGuard moduleName="fiscal"`. Guard local redireciona para `/fiscal/tarefas` se `!isAdmin && !isSuperAdmin`.
- `src/components/layout/AppSidebar.tsx` — adicionar item "Dashboard" (ícone `LayoutDashboard`) como **primeiro item** do grupo Fiscal, oculto para `colaborador` (mesmo filtro já usado em "Calendário Fiscal").

## Queries (hook único, TanStack Query)

Todas filtradas por `company_id` resolvido via `useCompany()` e por competência selecionada.

1. **tasksOfMonth** — `fiscal_tasks` WHERE `competence_year = year AND competence_month = month AND company_id = X AND deleted_at IS NULL`. Select: `id, status, due_date, fiscal_due_date, responsible_id`. Base para KPIs e gráfico.
2. **collaborators** — `profiles` WHERE `company_id = X AND role IN ('admin','colaborador') AND status_active = true`. Select: `id, full_name`.
3. **upcoming** — `fiscal_tasks` com joins, WHERE `status != 'concluido' AND due_date BETWEEN today AND today+7 AND company_id = X`, order `due_date ASC`, limit 20. Joins: `contacts(name)`, `responsible:profiles!fiscal_tasks_responsible_id_fkey(full_name)`, `fiscal_obligations_catalog(name)` (assumo FK `obligation_id`; se não existir, removo a coluna "Obrigação" e mostro `fiscal_tasks.title`).

Botão "Atualizar" invalida as 3 queries.

## Cabeçalho

- Título "Dashboard Fiscal".
- 2 `Select` (Mês PT 01–12, Ano 2025–2027), default = atual.
- Botão `RefreshCw` "Atualizar".

## Seção 1 — KPIs

Computados em memória a partir de `tasksOfMonth`:

| Card | Cálculo | Ícone | Borda |
|---|---|---|---|
| Total | `tasks.length` | `ListChecks` | `border-l-4 border-l-blue-500` |
| Concluídas | `count(status === 'concluido')` | `CheckCircle2` | `border-l-green-500` |
| Pendentes | `count(status === 'pendente')` | `Clock` | `border-l-yellow-500` |
| Atrasadas | `count(status !== 'concluido' && due_date < today)` | `AlertTriangle` | `border-l-red-500` |

Cada card: ícone topo direito, número grande (`text-3xl font-semibold`), label, percentual `Math.round(n/total*100)` ou `0%` se total = 0.

## Seção 2 — BarChart empilhado por colaborador

Recharts `BarChart` com `stackId="a"` em 3 `<Bar>`:
- `concluidas` — `hsl(142 71% 45%)` (verde)
- `pendentes` — `hsl(48 96% 53%)` (amarelo)
- `atrasadas` — `hsl(0 84% 60%)` (vermelho)

Dataset: para cada colaborador, contar tasks por status (atrasadas absorve qualquer task não-concluída com `due_date < today`; pendentes = `status === 'pendente'` e não-atrasadas; concluídas = `status === 'concluido'`). Inclui só colaboradores que aparecem em `tasksOfMonth` OU na lista de colaboradores (todos, mesmo com 0). Não-atribuídos agrupados como "Sem responsável".

`Tooltip` shadcn-chart com breakdown por status, `Legend` abaixo, eixos com `tickLine={false}`. Altura 320px em Card.

## Seção 3 — Progresso por colaborador

Para cada item de `collaborators`:
- Card com Avatar (inicial), nome.
- `Progress` (shadcn) com valor `concluidas/total*100` (ou 0).
- Texto `"{concluidas} de {total} tarefas — {pct}%"`.
- Se `atrasadas > 0`, `Badge variant="destructive"` "{N} atrasada(s)".

Grid responsivo: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.

## Seção 4 — Próximos vencimentos (7 dias)

Card + `Table` shadcn. Colunas: Cliente, Obrigação, Entrega Interna (`due_date`), Vencimento Fiscal (`fiscal_due_date`), Responsável, Status.

Status badge:
- `pendente` → amarelo
- `em_andamento` → azul
- atrasado (não concluído e `due_date < today`) → vermelho

Datas formatadas `dd/MM/yyyy` com `date-fns`. Loading: skeleton. Vazio: "Nenhum vencimento nos próximos 7 dias".

## Controle de acesso

- Sidebar: item escondido para `colaborador` (mesmo padrão atual com filtro por URL).
- Rota: `<ModuleGuard moduleName="fiscal">` + guard local `(!isAdmin && !isSuperAdmin) → <Navigate to="/fiscal/tarefas" replace />`.

## Notas técnicas

- Sem nova migration. Uso `from('fiscal_tasks').select(...) as any` para colunas que ainda não estão no `types.ts` gerado.
- KPIs e dataset do gráfico computados via `useMemo` sobre `tasksOfMonth` para evitar refetches.
- Sem alterar `FiscalTasks`, `FiscalCalendar` ou hooks existentes.
- "7 dias úteis": o pedido textual diz "7 dias úteis" mas o filtro SQL diz `+7`. Vou usar `+7 dias corridos` (alinhado ao SQL). Se quiser dias úteis de verdade, me avise — uso `addBusinessDays`.
