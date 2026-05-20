# Plano — 4 ajustes no módulo Fiscal

## AJUSTE 1 — Excluir tarefa (Kanban + Lista)

**Lista (`TaskListView.tsx`)** — já existe ícone de lixeira; falta apenas o dialog de confirmação. Substituir o `onDelete` direto por `AlertDialog` que confirma antes de chamar a mutation.

**Card do Kanban (`TaskCard.tsx`)** — adicionar `DropdownMenu` no canto superior direito (botão ⋯ `MoreVertical`) com:
- "Editar" → dispara um novo callback `onEdit` (abre `TaskDetailModal`, igual ao clique no card).
- "Excluir" → abre `AlertDialog` com texto "Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.", botões Cancelar / Excluir (variant destructive).

Para evitar que o clique no menu dispare o `onClick` do card ou o drag, envolver com `stopPropagation` e `e.preventDefault()` em `onPointerDown`.

**Encadeamento**: `KanbanBoard` recebe novos props `onEdit(task)` e `onDelete(taskId)`; `FiscalTasks.tsx` passa `handleTaskClick` (para editar) e `deleteTask.mutate`. Toast já vem do hook (`'Tarefa excluída'`) — ajustar para "Tarefa excluída com sucesso". A UI atualiza sozinha via `invalidateQueries`.

---

## AJUSTE 2 — Ordenação por coluna no Kanban

**Em `FiscalTasks.tsx`**: remover o `<Select>` de sortOrder global (linhas 292–304) e o state `sortOrder`. Remover também `sortOrder` do objeto `filters` para que o hook `useFiscalTasks` ordene sempre `due_date ASC` (default já tratado).

**Em `KanbanBoard.tsx`**:
- Novo state interno `columnSort: Record<string, 'asc' | 'desc'>` inicializado com `'desc'` para todas as 4 colunas.
- No cabeçalho de cada `DroppableColumn`, adicionar botão pequeno com ícone:
  - `ArrowDown` quando `desc` (mais recente primeiro)
  - `ArrowUp` quando `asc` (mais antigo primeiro)
  - Tooltip explicando o estado atual.
- Ao calcular `tasksByStatus`, aplicar `.sort()` por `due_date` usando a direção da coluna correspondente (client-side).

---

## AJUSTE 3 — Drag-and-drop em todas as colunas

Causa provável atual: `closestCorners` combinado com `verticalListSortingStrategy` mede a partir dos itens existentes, então colunas vazias ou distantes (3ª, 4ª) raramente "ganham" a colisão, e o drop volta para perto da origem.

**Correção em `KanbanBoard.tsx`**:
1. Trocar `collisionDetection={closestCorners}` por uma função custom que prioriza droppables de coluna: primeiro tenta `pointerWithin` contra os 4 IDs de coluna; se não houver, faz fallback para `closestCenter` entre as colunas (não entre tasks). Isso garante que o `over.id` seja sempre uma coluna válida (`a_fazer | em_progresso | aguardando_cliente | concluido`).
2. Em `handleDragEnd`, simplificar: `targetStatus = over.id as string`; remover o lookup `overTask` que mascarava bugs em colunas vazias.
3. Garantir que cada coluna mantenha `min-h` suficiente para receber o pointer mesmo vazia (já está `min-h-[200px]`, ok).
4. Manter validação de "anexo obrigatório para concluir" e a mutation otimista existente em `useFiscalTasks.updateTask` — já cobre o UPDATE no Supabase.

Teste mental: arrastar de "A Fazer" diretamente para "Aguardando Cliente" resolve `over.id = 'aguardando_cliente'` → UPDATE com esse status.

---

## AJUSTE 4 — Seletor de Obrigações em "Editar Dados Fiscais"

**Em `ContactEditSheet.tsx`, bloco `section === 'fiscal'`**, adicionar abaixo de "Colaborador Responsável" um campo "Obrigações Fiscais".

**Dados**:
- Query nova `obligations-catalog` → `fiscal_obligations_catalog` (`id, name` ordenado por `name`).
- Query nova `client-obligations-{contactId}` → `client_obligations` filtrado por `contact_id` (campos `obligation_id`).
- Habilitadas só quando `section === 'fiscal'`.

**State**: `selectedObligationIds: Set<string>` inicializado com os IDs retornados, e ressincronizado no `useEffect` de reset.

**Componente visual**: `Popover` + `Command` (mesmo padrão de `SearchableSelect.tsx`):
- Trigger: `<Button variant="outline">` com placeholder "Selecionar obrigações..." e contador `(N selecionada(s))`.
- Conteúdo: `CommandInput` (busca) + `CommandList` com cada obrigação; clicar alterna seleção (mantém o popover aberto, mostra `Check` à esquerda quando marcada).
- Abaixo do trigger: chips (`Badge` com `X`) para cada obrigação selecionada, com botão de remoção individual.

**Persistência em `handleSave`** (apenas no ramo `section === 'fiscal'`, após o `updateContact.mutate`):
1. Calcular `toDelete = original − selected` e `toInsert = selected − original`.
2. Buscar `companyId` via `useCompany()` (hook já existe no projeto).
3. `await supabase.from('client_obligations').delete().eq('contact_id', contact.id).in('obligation_id', toDelete)` se houver algum.
4. `await supabase.from('client_obligations').insert(toInsert.map(id => ({ contact_id: contact.id, obligation_id: id, company_id })))` se houver algum.
5. Invalidar `['client-obligations', contact.id]`.
6. Toast: "Dados fiscais atualizados."

Tabela `client_obligations` é acessada via cast `(supabase as any)` se ainda não estiver nos types — mesmo padrão usado em `FiscalTasks.tsx` para `fiscal_obligations_catalog`.

---

## Arquivos afetados

- `src/components/fiscal/TaskCard.tsx` — menu ⋯ + dialog de exclusão.
- `src/components/fiscal/KanbanBoard.tsx` — ordenação por coluna, collision detection, repassa `onEdit/onDelete`.
- `src/components/fiscal/TaskListView.tsx` — envolver lixeira em AlertDialog.
- `src/pages/FiscalTasks.tsx` — remover seletor global de sort, passar `onEdit`/`onDelete` ao Kanban.
- `src/components/contacts/ContactEditSheet.tsx` — bloco fiscal recebe seletor de obrigações + sync no save.

Nenhuma migração de banco necessária (todas as tabelas já existem).
