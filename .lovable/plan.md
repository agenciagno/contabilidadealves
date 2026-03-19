

## Plano: Limpar banco de dados e confirmar planilha soberana

### Parte 1 — Limpeza do banco de dados

Executar DELETEs sequenciais via insert tool na seguinte ordem:

1. `DELETE FROM transaction_attachments`
2. `DELETE FROM contact_documents`
3. `DELETE FROM contact_partners`
4. `DELETE FROM contact_notes`
5. `DELETE FROM contact_messages`
6. `DELETE FROM contact_logs`
7. `DELETE FROM boleto_controls`
8. `DELETE FROM global_logs`
9. `DELETE FROM transactions` (inclui soft-deleted)
10. `DELETE FROM contacts`
11. `DELETE FROM categories`
12. `DELETE FROM recurring_transactions`
13. `DELETE FROM banks`

**Preservados**: `companies`, `profiles`, `user_roles`.

### Parte 2 — Planilha soberana

Já verificado: `ImportSpreadsheetDialog.tsx` **não contém** nenhuma chamada a `calculateExpectedDate` nem lógica de preenchimento automático de datas. Datas vazias na planilha já resultam em `null`. **Nenhuma alteração de código é necessária.**

### Resumo

- 13 comandos DELETE sequenciais
- 0 alterações de código

