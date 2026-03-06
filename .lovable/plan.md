

## Plano: Limpar dados para nova importação

### Contexto
Existem 3.509 transações, 234 contatos, 46 eventos contábeis e 239 logs globais. Precisamos apagar tudo respeitando a ordem de chaves estrangeiras.

### Abordagem
Criar uma edge function temporária `cleanup-data` que executa DELETEs na ordem correta usando o service role key (bypassa RLS):

1. `transaction_attachments`
2. `contact_logs`, `contact_notes`, `contact_documents`, `contact_partners`, `contact_messages`
3. `boleto_controls`
4. `transactions`
5. `global_logs`
6. `contacts`
7. `categories`

**Tabelas preservadas**: `companies`, `profiles`, `user_roles`, `banks`, `recurring_transactions`.

### Implementação
- **Arquivo**: `supabase/functions/cleanup-data/index.ts`
- Edge function com CORS, sem JWT, executa os DELETEs sequencialmente via Supabase Admin client
- Após execução bem-sucedida, podemos remover a function

### Resultado
Base de dados limpa, pronta para nova importação via planilha.

