## Melhorias em /fiscal/tarefas

Implementação por blocos, mantendo todo o comportamento existente.

### Arquivos alterados

- `src/components/fiscal/TaskCard.tsx` — barra de prazo, badge SLA D-X, paperclip, borda amber em "aguardando_cliente", botão UserCog (quick reassign).
- `src/components/fiscal/KanbanBoard.tsx` — header amber para coluna "Aguardando Cliente" + ícone Clock; ordenação automática por `fiscal_due_date ASC` com atrasadas no topo; passar callback `onReassign` e `profileOptions` ao `TaskCard`.
- `src/components/fiscal/TaskDetailModal.tsx` — nova seção "Notas da Equipe" com lista + input; migração in-place de `notes` string → array JSON.
- `src/pages/FiscalTasks.tsx` — botão "Salvar filtro" + dropdown "Meus filtros" (localStorage, máx 5); passar `profileOptions` e `onReassign` ao KanbanBoard.

### Detalhes por item

**1. Coluna "Aguardando Cliente" destacada**
No `DroppableColumn` do KanbanBoard, quando `id === 'aguardando_cliente'`, header recebe `bg-amber-100 dark:bg-amber-900/20` e ícone `Clock` antes do label. O `TaskCard` detecta `task.status === 'aguardando_cliente'` e aplica `border-l-4 border-l-amber-500` + badge "Aguardando" amber dentro do card.

**2. Timer SLA**
Função `getSlaInfo(task)` usa `task.fiscal_due_date || task.due_date`. Calcula `daysLeft = differenceInDays(due, today)`. Retorna:
- `> 5`: green `D-X`
- `3–5`: amber `D-X`
- `1–2`: red com `animate-pulse` `D-X`
- `0`: red `D-0`
- `< 0`: red bg sólido "Atrasado há X dias"

Badge posicionado no canto inferior direito (junto ao avatar atual).

**3. Ordenação automática**
No `KanbanBoard`, dentro de cada coluna ordenar por `fiscal_due_date || due_date` ASC. Atrasadas (`daysLeft < 0`) ficam no topo independente da ordenação. Mantém o toggle de sort existente, mas o default vira ASC e "atrasados primeiro" é sempre aplicado.

**4. Badge de Anexo**
Já existe `Paperclip` ao lado do avatar — mover para canto inferior esquerdo, tamanho 14 (`w-3.5 h-3.5`), cor `text-muted-foreground`.

**5. Filtros Salvos por Colaborador**
Chave localStorage: `fiscal:saved-filters:<profileId>`. Estrutura: `[{id, name, filters: {startDate, endDate, contact, responsible, obligation}}]`. UI:
- Botão "Salvar filtro" abre um Popover com Input para nome → grava.
- Dropdown "Meus filtros" lista os salvos; click aplica; X remove.
- Máx 5 (botão desabilitado quando atingido).
Sem migração de banco.

**6. Quick Reassign**
No `TaskCard`, ícone `UserCog` aparece no hover (top-right, ao lado do MoreVertical). Click abre `DropdownMenu` com a lista de colaboradores (passada via prop `profileOptions`). Selecionar chama `onReassign(task.id, profileId)` que faz `supabase.from('fiscal_tasks').update({ responsible_id }).eq('id', ...)` + invalida cache. Reaproveita `handleInlineReassign` já existente em FiscalTasks.tsx.

**7. Notas em JSONB**
A coluna `notes` hoje é `text`. Estratégia sem alterar schema:
- Ao ler: tentar `JSON.parse(notes)`; se array → usar; se falhar e `notes` for texto não vazio → exibir como item "legado" (autor "—", data = `created_at` da task).
- Ao adicionar: criar array `[{profile_id, profile_name, text, created_at: ISO}, ...legados]`, `JSON.stringify` e salvar em `notes`.
- UI: lista ordenada `created_at DESC` (mais recente no topo), avatar com iniciais, nome, data formatada, texto. Input + botão "Adicionar".
- Substitui a seção "Observações" atual (mantém Textarea legado oculto, sem perda — o item legado fica visível na lista).

**8. Barra fina de prazo (2px) no topo do card**
`<div className="absolute top-0 left-0 right-0 h-0.5 rounded-t" />` dentro do `<Card className="... overflow-hidden">`, cor conforme SLA:
- green-500 / amber-500 / red-500 / red-700 + `animate-pulse` (atrasado).

### Notas técnicas

- `FiscalTask` interface só tem `due_date`. Como `fiscal_due_date` existe no banco, expandir tipo localmente: `task as FiscalTask & { fiscal_due_date?: string | null }` e usar fallback `fiscal_due_date ?? due_date` em todos os cálculos SLA. Sem alteração de hook necessária — `select('*')` já traz a coluna.
- Nenhuma migração Supabase. Nenhum alteração em RLS, rotas, ou auth.
- Sem mudanças em TaskListView e TaskCalendarView neste PR (escopo é Kanban + Modal + Filtros).
