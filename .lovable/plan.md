

## Plano: Limpeza completa do banco de dados

Executar DELETEs sequenciais respeitando chaves estrangeiras, preservando apenas `companies`, `profiles` e `user_roles`.

### Ordem de execução

| # | Tabela |
|---|--------|
| 1 | `transaction_attachments` |
| 2 | `contact_documents` |
| 3 | `contact_partners` |
| 4 | `contact_notes` |
| 5 | `contact_messages` |
| 6 | `contact_logs` |
| 7 | `boleto_controls` |
| 8 | `global_logs` |
| 9 | `transactions` (inclui soft-deleted) |
| 10 | `contacts` |
| 11 | `categories` |
| 12 | `recurring_transactions` |
| 13 | `banks` |

### Detalhes

- 13 comandos DELETE via insert tool
- 0 alterações de código
- Tabelas de infraestrutura preservadas: `companies`, `profiles`, `user_roles`

