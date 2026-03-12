

## Exclusão de 1.113 Transações Pendentes

O banco possui **1.113 transações** com `is_paid = false`. O usuário confirmou a exclusão.

### Execução

Criar e executar uma migration SQL única para deletar todos os registros pendentes:

```sql
DELETE FROM transactions WHERE is_paid = false;
```

Isso removerá permanentemente todas as 1.113 transações pendentes. Transações pagas/recebidas (`is_paid = true`) não serão afetadas.

Após a exclusão, o cache do frontend será invalidado automaticamente na próxima navegação (as queries de `transactions`, `server-transactions`, `banks` etc. recarregarão dados atualizados).

### Arquivo alterado
Nenhum arquivo de código será alterado. Apenas uma operação de dados no banco.

