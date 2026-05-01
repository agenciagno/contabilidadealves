## Objetivo

Garantir que o backup exporta e restaura **todas** as tabelas do sistema. Atualmente faltam 4 tabelas.

## Tabelas faltantes

1. **`contact_logs`** — Logs de auditoria dos clientes
2. **`global_logs`** — Logs globais do sistema
3. **`dre_budgets`** — Orçamentos do DRE por categoria/mês
4. **`fiscal_tasks`** — Tarefas fiscais (kanban)

## Alterações em `src/components/settings/BackupTab.tsx`

1. Adicionar as 4 tabelas ao array `BACKUP_TABLES`
2. Adicionar ao `RESTORE_ORDER` respeitando dependências (logs e budgets depois de categories/contacts, fiscal_tasks depois de contacts)
3. Atualizar o texto descritivo do card de exportação para incluir as novas tabelas

Nenhuma alteração de lógica, banco ou schema necessária — apenas inclusão das tabelas nos arrays existentes.