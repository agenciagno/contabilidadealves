

## Plano: Central de Tarefas do Módulo Fiscal + Ações em Massa em Clientes

### Resumo

Criar a tabela `fiscal_tasks` no banco, a página `/fiscal/tarefas` com 3 modos de visualização (Kanban, Lista, Calendário), RBAC em nível de query, modal de detalhes com permissões por role, campo `responsible_id` no cadastro de cliente, e ações em massa (bulk delete + bulk edit) na tela de Clientes.

### Mudanças

| # | Recurso | Mudança |
|---|---|---|
| 1 | **Migration SQL** | Criar tabela `fiscal_tasks` + adicionar `responsible_id` na tabela `contacts` + RLS policies |
| 2 | `src/hooks/useFiscalTasks.ts` | Hook CRUD com RBAC: colaborador filtra por `responsible_id`, admin/super_admin puxa tudo |
| 3 | `src/pages/FiscalTasks.tsx` | Página com filtros (date range, cliente, colaborador, obrigação) + toggle de 3 visualizações |
| 4 | `src/components/fiscal/KanbanBoard.tsx` | Board Kanban com 4 colunas + drag-and-drop via `@dnd-kit/core` |
| 5 | `src/components/fiscal/TaskCard.tsx` | Card com nome do cliente, obrigação, avatar, cor dinâmica de prazo |
| 6 | `src/components/fiscal/TaskListView.tsx` | Tabela com as mesmas colunas do Kanban |
| 7 | `src/components/fiscal/TaskCalendarView.tsx` | Calendário mensal com tarefas posicionadas por due_date |
| 8 | `src/components/fiscal/TaskDetailModal.tsx` | Modal de detalhes com edição condicional por role + upload de anexo |
| 9 | `src/components/contacts/ContactFormDialog.tsx` | Adicionar dropdown "Colaborador Responsável" |
| 10 | `src/pages/Contacts.tsx` | Adicionar checkboxes + barra de ações em massa (excluir + editar) |
| 11 | `src/components/contacts/ContactBulkEditDialog.tsx` | Modal bulk edit: boleto toggle, regime tributário, responsável |
| 12 | `src/App.tsx` | Nova rota `/fiscal/tarefas` |
| 13 | `src/components/layout/AppSidebar.tsx` | Novo módulo "Fiscal" com item "Tarefas" |

---

### 1. Migration SQL

```sql
-- Adicionar responsible_id aos contatos
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS responsible_id uuid;

-- Tabela fiscal_tasks
CREATE TABLE public.fiscal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  responsible_id uuid,
  title varchar NOT NULL,
  description text,
  status varchar NOT NULL DEFAULT 'a_fazer',
  due_date date NOT NULL,
  attachment_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies usando get_user_company_id e is_super_admin
CREATE POLICY "fiscal_tasks_select" ON public.fiscal_tasks
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );
CREATE POLICY "fiscal_tasks_insert" ON public.fiscal_tasks
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );
CREATE POLICY "fiscal_tasks_update" ON public.fiscal_tasks
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );
CREATE POLICY "fiscal_tasks_delete" ON public.fiscal_tasks
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );
```

Status possíveis: `a_fazer`, `aguardando_cliente`, `em_progresso`, `concluido`.

### 2. Hook `useFiscalTasks.ts`

- Query filtra por `company_id` via RLS
- Se `isColaborador`: adiciona `.eq('responsible_id', user.id)` na query
- Filtros opcionais: `contact_id`, `responsible_id`, `dateRange`, `title` (obrigação)
- Mutations: create, update (status/campos), delete
- Regra: status só muda para `concluido` se `attachment_url` não for null

### 3. Página `FiscalTasks.tsx`

**Barra de filtros (topo):**
- Date Range Picker (mesmo padrão do sistema)
- Select "Cliente" (lista de contacts)
- Select "Colaborador Responsável" (lista de profiles da company) — **oculto se isColaborador**
- Input "Obrigação" (busca por título)
- Toggle: Kanban | Lista | Calendário

### 4. Kanban Board

4 colunas na ordem: `A Fazer` → `Aguardando Cliente` → `Em Progresso` → `Concluído`

Dependências: `@dnd-kit/core`, `@dnd-kit/sortable`

Ao dropar card em nova coluna → mutation de update do status. Se dropar em "Concluído" sem `attachment_url`, exibir toast de erro e reverter.

### 5. Task Card — Cores dinâmicas

```typescript
const daysLeft = differenceInDays(dueDate, today);
const color = daysLeft < 0 ? 'red' 
  : daysLeft <= 2 ? 'orange' 
  : daysLeft <= 6 ? 'yellow' 
  : 'green';
```

Exibe: nome do cliente, título da obrigação, avatar do responsável, badge com data colorida.

### 6-7. Lista e Calendário

**Lista:** Tabela com colunas: Cliente | Obrigação | Responsável | Vencimento | Status | Ações

**Calendário:** Grid mensal renderizando tarefas posicionadas no dia do `due_date`. Clique abre o modal de detalhes.

### 8. Modal de Detalhes (`TaskDetailModal`)

**Colaborador:**
- Campos readonly: título, cliente, responsável, data
- Pode editar: campo "Observações" (notes)
- Upload de anexo obrigatório (storage bucket `transaction-attachments`)
- Botão "Marcar como Concluído" visível apenas se attachment_url preenchido

**Admin/Super Admin:**
- Edita todos os campos: título, descrição, due_date, responsible_id, status
- Alterar `responsible_id` atualiza apenas esta tarefa (não o cliente)

### 9. ContactFormDialog — Responsável padrão

Adicionar Select "Colaborador Responsável" que lista profiles da company.
Grava `responsible_id` na tabela `contacts`.
Quando uma `fiscal_task` é criada para este cliente, herda o `responsible_id` como default.

### 10-11. Ações em Massa na tela de Clientes

**Contacts.tsx:**
- Adicionar `<Checkbox>` em cada linha da tabela (modo lista)
- Barra de ações aparece quando `selectedIds.length > 0`
- Botões: "Excluir Selecionados" (com confirmação) e "Editar Selecionados"

**ContactBulkEditDialog.tsx:**
- Campos: Geração de Boleto (Switch), Regime Tributário (Select), Colaborador Responsável (Select)
- Ao salvar, faz `supabase.from('contacts').update({...}).in('id', selectedIds)`

### 12-13. Rota e Sidebar

**App.tsx:** Nova rota `/fiscal/tarefas` → `<FiscalTasks />`

**AppSidebar.tsx:** Novo módulo no array `menuModules`:
```typescript
{
  title: 'Fiscal',
  icon: FileCheck,
  moduleKey: 'fiscal',
  items: [
    { title: 'Tarefas', url: '/fiscal/tarefas', icon: CalendarClock, iconName: 'calendar-clock' },
  ],
}
```

### Dependências npm

- `@dnd-kit/core` e `@dnd-kit/sortable` para drag-and-drop no Kanban

### Resumo
- 1 migration (nova tabela + coluna em contacts)
- 8 arquivos novos
- 4 arquivos editados (App.tsx, AppSidebar, ContactFormDialog, Contacts.tsx)

