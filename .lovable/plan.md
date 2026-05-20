Implementação dos 7 ajustes conforme detalhado na mensagem anterior.

1. **Dashboard** — remover botão "Exportar", DropdownMenu, handlePrint e blocos print-only em `FiscalDashboard.tsx`.
2. **Lista Tarefas** — colunas Status (`w-24`) e Ações (`w-16`, alinhadas à esquerda) em `TaskListView.tsx`.
3. **Excluir selecionados** — botão destrutivo + AlertDialog na barra de seleção em `FiscalTasks.tsx`, executando `DELETE ... WHERE id IN (...)`.
4. **Shift+click** — seleção por intervalo em `TaskListView.tsx` com `lastClickedIndex` local, reset quando seleção zera.
5. **Colaboradores** — substituir "tarefas pendentes" por "clientes vinculados" via novo hook `useClientCountByProfile` em `useCollaboratorCoverage.ts` e ajuste em `FiscalCollaborators.tsx`.
6. **Upload anexo → concluído** — em `TaskDetailModal.tsx`, no `handleUpload` chamar `onUpdate(id, { attachment_url, status: 'concluido' })` com toast atualizado.
7. **Filtro tax_regime** — novo helper `src/lib/fiscal-filters.ts` (`fetchValidFiscalContactIds`) usado em `useFiscalTasks.ts`, `useFiscalDashboard.ts` (mês + upcoming), `useCollaboratorCoverage.ts` (clients/pending counts) e filtro do dropdown de cliente em `FiscalTasks.tsx`. Excluir `tax_regime` null, vazio ou 'Nenhum'.

Sem migrações de banco.