## Causa raiz identificada

O painel de diagnóstico mostrou:

- Soma dos cards (ativos visíveis): **R$ 11.443,67**
- Total agregado replicado pelo diagnóstico: **R$ 11.443,67**
- Card "Saldo total em contas ativas" (real): **R$ 11.540,50**
- Diferença: **R$ 96,83**

O diagnóstico replica a fórmula do hook e bate com a soma dos cards. Logo, o problema **não é diferença de fórmula** — está em **quais linhas o hook real consegue ler do banco**.

A pista decisiva está no rodapé: **"Extrato Unificado — 2011 lançamentos"**. Mais de 1000 linhas pagas no ano, ou seja, a query do período pagina (limite Supabase = 1000).

Olhando `src/hooks/useBankTransactions.ts → fetchAllPeriodRows`:

```ts
.order('date', { ascending: true })
.order('created_at', { ascending: true });
// ❌ sem desempate por id
```

Sem `id` como desempate final, o Postgres pode reordenar arbitrariamente registros com o mesmo `(date, created_at)`. Em paginação iterativa por `range(offset, offset+999)` isso causa:

- linhas duplicadas (entram em duas páginas) → saldo **inflado**
- linhas saltadas (não entram em nenhuma) → saldo deflacionado

Os R$ 96,83 a mais são exatamente esse efeito: o card "Saldo total em contas ativas" usa a query paginada instável; o card individual do Sicoob usa filtro `.eq('bank_id', sicoob)` que devolve menos linhas (provavelmente <1000) e não dispara o bug; o diagnóstico já usa ordenação estável (`created_at, id`) e por isso bate com os cards.

Isso é exatamente a regra `mem://architecture/database/stable-pagination-logic`, que já está aplicada em outros hooks (`useTransactions`) mas **não foi aplicada no `fetchAllPeriodRows`** de bancos.

A `fetchAllPriorRows` no mesmo arquivo já tem `order('created_at').order('id')` — está correta. O bug está só no `fetchAllPeriodRows`.

---

## Por que o ambiente publicado mostra valores diferentes do dev

Não é um bug separado. Test e Live são bancos físicos diferentes (refs distintos), então naturalmente têm volumes diferentes de lançamentos. A divergência de saldo dentro de cada ambiente é o mesmo bug acima, apenas com magnitudes diferentes (em Live são R$ 96,83 porque ultrapassa 1000 linhas; em Test pode ser outro valor ou nenhum se tiver <1000).

---

## Plano de correção (mínimo, cirúrgico)

### Etapa 1 — Corrigir paginação instável

**Arquivo:** `src/hooks/useBankTransactions.ts`

Em `fetchAllPeriodRows`, adicionar `.order('id', { ascending: true })` como último critério de ordenação, mantendo os anteriores:

```ts
.order('date', { ascending: true })
.order('created_at', { ascending: true })
.order('id', { ascending: true });   // ← desempate estável
```

Nenhuma outra alteração de lógica, filtro, fórmula ou contrato do hook.

### Etapa 2 — Validar no app publicado

Após o deploy:
1. Recarregar `/bancos` no app Live.
2. Confirmar que o card "Saldo total em contas ativas" passa de R$ 11.540,50 para **R$ 11.443,67** (igual à soma dos cards).
3. Confirmar no painel de diagnóstico que "Diferença" continua R$ 0,00.

### Etapa 3 — Limpeza

Após o usuário confirmar que o saldo bateu:
- Remover `BankBalanceDiagnosticPanel` de `src/pages/Banks.tsx` e o arquivo do componente.
- (Opcional) manter o banner de ambiente DEV — é independente desta investigação.

---

## Arquivos envolvidos

- **Editar:** `src/hooks/useBankTransactions.ts` (1 linha em `fetchAllPeriodRows`)
- **Editar (depois da validação):** `src/pages/Banks.tsx` (remover painel diagnóstico)
- **Excluir (depois da validação):** `src/components/banks/BankBalanceDiagnosticPanel.tsx`

## Fora de escopo

- Qualquer mudança em fórmulas de saldo, RLS, schema, triggers ou sincronização Test/Live.
- Mudanças visuais nos cards.
