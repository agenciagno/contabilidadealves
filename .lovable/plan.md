

# Limpeza do Banco de Dados

## Dados Atuais
| Tabela | Registros |
|---|---|
| transactions | 2.851 |
| contacts | 223 |
| banks | 2 |
| categories | 52 |
| recurring_transactions | 0 |
| boleto_controls | 45 |
| contact_logs | 7 |
| contact_documents | 4 |
| global_logs | 512 |

## Plano de Execução

Executar DELETEs na ordem correta (tabelas dependentes primeiro, depois as principais) via migration:

1. `DELETE FROM transaction_attachments` (anexos de transações)
2. `DELETE FROM contact_logs` (logs de contatos)
3. `DELETE FROM contact_notes` (notas de contatos)
4. `DELETE FROM contact_partners` (sócios de contatos)
5. `DELETE FROM contact_documents` (documentos de contatos)
6. `DELETE FROM contact_messages` (mensagens de contatos)
7. `DELETE FROM boleto_controls` (controle de boletos)
8. `DELETE FROM global_logs` (logs globais)
9. `DELETE FROM transactions` (lançamentos — isso também zera saldos via trigger)
10. `DELETE FROM recurring_transactions` (contas recorrentes)
11. `DELETE FROM contacts` (clientes/fornecedores)
12. `DELETE FROM categories` (categorias/eventos contábeis)
13. `UPDATE banks SET current_balance = initial_balance` (resetar saldos bancários)

**Nota:** Os bancos serão mantidos com saldo resetado (initial_balance). Se desejar excluir os bancos também, será adicionado `DELETE FROM banks`.

Após a limpeza, o sistema estará pronto para receber uma nova importação sem conflitos.

