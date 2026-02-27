

# Correção da Importação em Massa de Planilha

## Problemas Identificados

### 1. Inserção Individual (Causa Raiz Principal)
O `onImport` em `Transactions.tsx` (linha 728-732) insere **uma transação por vez** via `createTransaction.mutateAsync(t)`. Cada chamada executa:
- 1 request para buscar o usuário
- 1 request para buscar o perfil
- 1 insert na tabela `transactions`
- 1 insert na tabela `global_logs` (audit)
- 1 invalidação de queries

Para 2608 registros = ~13.000 requests HTTP. Isso causa timeout, falhas parciais e perda de dados.

### 2. Trigger de Saldo Bancário Disparada 2608 Vezes
O trigger `update_bank_balance` recalcula o saldo do banco a cada INSERT individual, causando lentidão exponencial.

### 3. Campo `date` (Data Pagamento) Incorreto
Quando a transação não tem Data Pagamento, o código envia `date: undefined`. O banco preenche com `CURRENT_DATE`, fazendo transações pendentes aparecerem com data de hoje em vez de sem data de pagamento. Isso distorce filtros e relatórios.

### 4. Filtro Padrão "Mês Atual" em Lançamentos
A página filtra por `date` (pagamento) no mês atual. Transações importadas com datas fora do mês não aparecem.

## Plano de Correção

### Arquivo 1: `src/hooks/useTransactions.ts`
- Adicionar nova mutation `bulkCreateTransactions` que:
  - Busca user/profile **uma única vez**
  - Insere em lotes de 500 registros via `supabase.from('transactions').insert(batch)`
  - Cria **um único** log global resumido ("2608 transações importadas via planilha")
  - Invalida queries **uma única vez** no `onSuccess`

### Arquivo 2: `src/pages/Transactions.tsx`
- Substituir o loop `for...of` no `onImport` por chamada única ao `bulkCreateTransactions`
- Após importação, invalidar manualmente `['banks']`, `['contacts']`, `['categories']` para sincronizar

### Arquivo 3: `src/components/transactions/ImportSpreadsheetDialog.tsx`
- Corrigir mapeamento de `date`: quando não há Data Pagamento e status é "pendente", enviar `date: dueDateStr || issueDateStr || new Date().toISOString().split('T')[0]` (garantir que sempre há uma data válida para ordenação)
- Corrigir lógica de `description`: usar nome do Evento Contábil como description (conforme regra de negócio existente), com fallback para Histórico

### Arquivo 4: `src/hooks/useTransactions.ts` (query)
- Sem alteração na query — o `invalidateQueries` já atualiza todos os caches

## Detalhes Técnicos

### Bulk Insert (useTransactions.ts)

```typescript
const bulkCreateTransactions = useMutation({
  mutationFn: async (transactions: TransactionInsert[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data: profile } = await supabase
      .from('profiles').select('company_id').eq('user_id', user.id).single();
    if (!profile) throw new Error('Perfil não encontrado');

    const withCompany = transactions.map(t => ({
      ...t, company_id: profile.company_id
    }));

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let totalInserted = 0;
    for (let i = 0; i < withCompany.length; i += BATCH_SIZE) {
      const batch = withCompany.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('transactions').insert(batch);
      if (error) throw error;
      totalInserted += batch.length;
    }

    // Single audit log
    await createGlobalLog({
      action: 'IMPORTACAO',
      module: 'FINANCEIRO',
      entityId: null,
      entityName: 'Importação em Massa',
      details: `${totalInserted} transações importadas via planilha`,
    });

    return totalInserted;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['banks'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['global-logs'] });
    toast({ title: 'Importação concluída!' });
  },
});
```

### Transactions.tsx — onImport simplificado

```typescript
onImport={async (txns) => {
  await bulkCreateTransactions.mutateAsync(txns);
}}
```

### ImportSpreadsheetDialog — campo date corrigido

```typescript
// Garantir date válido: priorizar Data Pagamento, fallback para Vencimento, Emissão
date: paymentDateStr || dueDateStr || issueDateStr || new Date().toISOString().split('T')[0],
```

## Resultado Esperado

- 2608 transações inseridas em ~6 requests (500+500+500+500+500+108) em vez de ~13.000
- Saldo bancário recalculado corretamente pelo trigger (menos disparos por batch)
- Dashboard, Lançamentos, Pagar/Receber, Bancos e Eventos Contábeis atualizados e sincronizados
- Todas as datas (Emissão, Vencimento, Prevista, Pagamento) preservadas da planilha

