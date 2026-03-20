

## Plano: Implementar "Limpeza de Dados (Hard Reset)" na aba Backup

### Resumo

Adicionar uma seção de "Limpeza de Sistema / Reset" dentro do componente `BackupTab.tsx`, com checkboxes para selecionar módulos, modal de confirmação com backup integrado e campo de digitação "CONFIRMAR".

### Mudanças

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `src/components/settings/BackupTab.tsx` | Adicionar seção completa de Hard Reset com checkboxes, modal e lógica de exclusão |

### Detalhes técnicos

**UI — Seção de Limpeza** (abaixo dos cards de Export/Restore existentes):
- Card com ícone vermelho e título "Limpeza de Sistema / Reset"
- 5 checkboxes (todos marcados por padrão): Conta Corrente/Bancos, Eventos Contábeis, Boletos, Transações, Clientes
- Botão vermelho "Apagar Dados Selecionados"

**Modal de Alerta Crítico**:
- `AlertDialog` com aviso de operação irreversível
- Botão "Baixar Backup Antes de Apagar" que chama `handleExport` (já existente)
- Input onde o usuário deve digitar "CONFIRMAR" para desbloquear o botão final
- Botão "Executar Exclusão Definitiva" (desabilitado até digitar CONFIRMAR)

**Lógica de Exclusão** — Ordem estrita respeitando FKs, condicional aos checkboxes:

```text
Se Transações   → DELETE transaction_attachments
Se Clientes     → DELETE contact_documents, contact_partners, contact_notes, contact_messages, contact_logs
Se Boletos      → DELETE boleto_controls
Se Transações   → DELETE global_logs, transactions (sem filtro de deleted_at)
Se Clientes     → DELETE contacts
Se Eventos      → DELETE categories
Se Transações   → DELETE recurring_transactions
Se Bancos       → DELETE banks
```

Cada DELETE usa `supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')` (workaround para deletar todos os registros via SDK).

**Pós-exclusão**: toast de sucesso + `queryClient.invalidateQueries()` + `window.location.reload()`.

**Proteção**: tabelas `companies`, `profiles`, `user_roles` nunca são tocadas.

