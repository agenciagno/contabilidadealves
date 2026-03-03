

## Plano: Zerar banco de dados

Deletar todos os dados das tabelas na ordem correta (respeitando dependências):

1. `transaction_attachments`
2. `transactions`
3. `contact_documents`, `contact_logs`, `contact_notes`, `contact_messages`, `contact_partners`
4. `boleto_controls`
5. `recurring_transactions`
6. `global_logs`
7. `contacts`
8. `banks`
9. `categories`

As tabelas `companies`, `profiles` e `user_roles` serão preservadas (infraestrutura de autenticação e multi-tenancy).

