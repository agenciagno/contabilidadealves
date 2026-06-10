Investiguei o código e o banco. Encontrei dois pontos a corrigir.

## 1. Mensagem "X transação(ões) ignoradas: Data de Pagamento ausente"

Essa mensagem só existe na mutação antiga `bulkTogglePaid` (em `useTransactions.ts`). Já não há nenhum botão chamando ela (a "Pagar X" agora chama `bulkSettleWithDate` via `BulkSettleDialog`). Mas a mutação continua exportada e pode estar sendo disparada por código antigo em cache ou por engano.

**Ação:** remover por completo `bulkTogglePaid` para garantir que essa toast nunca mais apareça.

- Em `src/hooks/useTransactions.ts`: deletar o bloco `bulkTogglePaid` (≈ linhas 257–306) e a entrada `bulkTogglePaid,` no return.
- Em `src/pages/Transactions.tsx`: remover `bulkTogglePaid` da desestruturação na linha 636.

## 2. Evento Contábil sumindo após liquidar

Verifiquei direto no banco: há transações pagas com `category_id = NULL` (ex.: `1eda8d42-…`, 642,00, 22/04/26, contato GABRIEL WENDERSON). Isso confirma que em algum momento o payload de liquidação salvou `category_id: null`.

O caminho do botão verde "$" abre o `TransactionFormDialog` em modo Liquidar. Hoje o payload faz `category_id: categoryId || null`. Se por qualquer razão (race entre `setCategoryId(transaction.category_id)` e renderização, refetch de `categories` ainda vazio, etc.) o estado `categoryId` estiver vazio no momento do submit, ele sobrescreve com `null` o valor que existia.

**Ação defensiva:** nos payloads que NÃO são para criar uma transação nova, usar fallback para o valor original da transação quando o estado local estiver vazio. Isso preserva 100% da regra (usuário pode trocar o evento normalmente — só não permite "perder" silenciosamente).

Em `src/components/transactions/TransactionFormDialog.tsx`, nos branches:

- **isSettleMode** (linha 323): `category_id: categoryId || transaction?.category_id || null` — idem `bank_id`, `contact_id`.
- **isAPrazo + isEditing** (linha 345): mesmo fallback (só quando `isEditing`, para não afetar criação nova).
- **Edit não-settle** (linha 368): mesmo fallback.
- **Nova à vista** (linha 393): mantém como está (não há `transaction`).

Nada mais é alterado — nenhuma lógica de negócio, validação ou UI.

## Resumo dos arquivos

- `src/hooks/useTransactions.ts` — remover `bulkTogglePaid`.
- `src/pages/Transactions.tsx` — remover `bulkTogglePaid` da desestruturação.
- `src/components/transactions/TransactionFormDialog.tsx` — fallback em `category_id`/`bank_id`/`contact_id` nos 3 branches que envolvem uma transação existente.

Pronto para aplicar?
