

## Plano: Correção de Divergências em Saldos, Cálculos e Integridade de Eventos Contábeis

### Problemas Identificados

**1. Dashboard usa `t.amount` em vez de `paid_amount` para transações pagas**
- `Dashboard.tsx` linhas 178-193: Os KPIs "Receitas Recebidas" e "Contas Pagas" somam `t.amount` para transações pagas, ignorando `paid_amount`. Se o valor pago difere do original, o KPI fica errado.
- Linhas 228-243: Métricas anuais (`annualMetrics`) cometem o mesmo erro — usam `Number(t.amount)` para transações pagas em vez de `paid_amount`.
- **Regra do sistema**: transações pagas devem usar `paid_amount` (via `isEffectivelyPaid` + `getEffectiveAmount`).

**2. Dashboard não usa `isEffectivelyPaid` para determinar status**
- Linhas 179, 183, 188, 191: Usa `t.is_paid` diretamente sem verificar `isEffectivelyPaid`. Uma transação com `is_paid=true` mas sem `date` ou `paid_amount` é tratada como paga.

**3. CashFlowTab (Pagar/Receber) — running balance usa `t.amount` para pendentes (OK), mas honorários com juros não refletem no saldo acumulado**
- Linha 641-645: O saldo acumulado usa `amt` (amount original), não `displayAmount` (com juros/multa). Isso é inconsistente — o KPI mostra um valor com juros mas o saldo não o inclui.

**4. `bulkCreateTransactions` não invalida DRE**
- Linha 344-349: Após importação em massa, invalida `transactions`, `banks`, `contacts`, `categories` mas **falta** invalidar `dre-previsto` e `dre-realizado`.

**5. Integridade de Eventos Contábeis ao mudar hierarquia**
- `useCategories.ts` → `updateCategory`: quando um Evento Macro vira Sub Evento (ou vice-versa), a transação continua vinculada ao `category_id` correto. **Não há problema de integridade** porque `category_id` referencia o ID do evento, não sua posição na hierarquia. O `parent_id` é atributo da categoria, não da transação.
- **Porém**, se um Evento Macro é deletado, seus Sub Eventos ficam órfãos (`parent_id` aponta para ID inexistente). O `deleteCategory` não limpa os filhos.

**6. Planilha de importação — modelo está correto**
- Os 12 headers estão alinhados com os campos do sistema.
- A lógica de matching por nome+tipo para Eventos Contábeis está correta.
- **Único problema menor**: a importação não invalida `dre-previsto`/`dre-realizado` (item 4).

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/pages/Dashboard.tsx` | Corrigir `summary` e `annualMetrics` para usar `isEffectivelyPaid` + `getEffectiveAmount` |
| 2 | `src/hooks/useTransactions.ts` | Adicionar invalidação de DRE em `bulkCreateTransactions` |
| 3 | `src/hooks/useCategories.ts` | No `deleteCategory`, limpar `parent_id` dos filhos órfãos antes de deletar |
| 4 | `src/components/transactions/CashFlowTab.tsx` | Manter running balance consistente (sem mudança funcional — decisão de design sobre juros) |

### Detalhes Técnicos

**Dashboard.tsx — summary corrigido:**
```typescript
import { isEffectivelyPaid, getEffectiveAmount } from '@/lib/financial-utils';

const receitasPagas = transactions
  .filter(t => t.type === 'receita' && isEffectivelyPaid(t))
  .reduce((sum, t) => sum + getEffectiveAmount(t), 0);
```
Mesma lógica para `despesasPagas` e `annualMetrics`.

**bulkCreateTransactions — invalidação DRE:**
```typescript
queryClient.invalidateQueries({ queryKey: ['dre-previsto'] });
queryClient.invalidateQueries({ queryKey: ['dre-realizado'] });
```

**deleteCategory — proteção de órfãos:**
```typescript
// Antes de deletar, desvincula filhos
await supabase
  .from('categories')
  .update({ parent_id: null })
  .eq('parent_id', id);
```

### Resumo
- 3 arquivos editados
- 0 migrations
- Corrige divergências nos KPIs do Dashboard que usam `amount` ao invés de `paid_amount`
- Garante invalidação de cache DRE na importação em massa
- Protege integridade hierárquica ao excluir Eventos Macro

