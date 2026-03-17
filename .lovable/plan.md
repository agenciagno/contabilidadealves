

## Plano: Módulo de Backup Manual e Restauração

### Arquitetura

Um novo componente `BackupTab` será adicionado como aba em Configurações. A lógica de export/import ficará toda no cliente (não precisa de edge function), usando o SDK Supabase para buscar e upsert dados.

### 1. Novo componente: `src/components/settings/BackupTab.tsx`

**Exportação:**
- Botão "Exportar Backup (JSON)" que busca todas as linhas (com paginação para ultrapassar o limite de 1000) das tabelas: `transactions`, `contacts`, `categories`, `banks`, `recurring_transactions`, `contact_partners`, `contact_notes`, `contact_documents`, `contact_messages`, `boleto_controls`
- Todas com `.is('deleted_at', null)` onde aplicável (transactions)
- Compila em objeto JSON `{ version: 1, exported_at, tables: { transactions: [...], contacts: [...], ... } }`
- Dispara download via `URL.createObjectURL` + `<a>` com nome `backup_contabilidade_YYYY-MM-DD.json`

**Restauração:**
- Input de upload (drag-and-drop zone + botão) aceita apenas `.json`
- Ao selecionar arquivo: lê com `FileReader`, parseia JSON, valida estrutura (deve ter `version` e `tables` com arrays)
- Abre AlertDialog de confirmação: "Atenção: A restauração pode sobrescrever dados atuais. Deseja continuar?"
- Ao confirmar: executa `.upsert()` em cada tabela na ordem correta (respeitando foreign keys): `categories` → `contacts` → `banks` → `transactions` → demais tabelas dependentes
- Progress bar visual durante o processo
- Toast de sucesso/erro
- Após sucesso: `queryClient.invalidateQueries()` global + `window.location.reload()` após 2s

**Feedback visual:**
- Estado de loading no botão de export com spinner
- Progress indicator durante restauração
- Toasts de sucesso/erro via sonner

### 2. Integração em `SettingsPage.tsx`

- Importar `BackupTab`
- Adicionar nova aba "Backup" com ícone `Database` entre "Lixeira" e o final
- Nova `TabsTrigger` + `TabsContent`

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/settings/BackupTab.tsx` | **Novo** — UI completa de backup/restauração |
| `src/pages/SettingsPage.tsx` | Adicionar aba "Backup e Restauração" |

Nenhuma migration necessária.

