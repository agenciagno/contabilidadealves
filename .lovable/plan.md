## Objetivo

Identificar a origem exata da diferença de **R$ 96,83** entre:
- **Soma dos cards visíveis**: Caixa Geral (R$ 0,00) + Sicoob (R$ 11.443,67) = **R$ 11.443,67**
- **Card "Saldo total em contas ativas"**: **R$ 11.540,50**

Como o ambiente publicado usa o banco **Live** (`wpczgwxsriezaubncuom`), e nossas ferramentas internas só conseguem ler o banco **Test**, a investigação precisa rodar **dentro do app publicado**, sem alterar nenhuma lógica.

---

## Hipóteses a validar (em ordem de probabilidade)

1. **Existe um terceiro banco ativo "oculto" do usuário** (talvez `is_active = true` mas filtrado da listagem por outro motivo, ou um banco antigo sem nome aparente) cujo saldo entra no total mas não aparece como card.
2. **Existe um banco marcado como `is_invisible = true`** (apesar do usuário dizer que não há) — o cálculo do total já exclui invisíveis, então isso causaria o efeito *oposto*. Vale checar mesmo assim.
3. **Banco com `is_active = true` mas sem transações visíveis no ano** — initial_balance entra no total, mas se também tem card, o card mostraria esse mesmo valor. Se NÃO tem card por algum filtro de UI, gera divergência.
4. **Diferença de arredondamento acumulado** entre soma de transações por banco vs soma agregada (improvável gerar exatamente R$ 96,83).
5. **Transação paga com `bank_id` apontando para banco deletado / órfão** — excluída pelo `.in(activeBankIds)`, então não causaria diff. Descartável.

A causa mais provável é a **hipótese 1 ou 3**: um terceiro registro em `banks` que entra no total mas o usuário não percebe na listagem.

---

## Plano de Investigação (sem alterar lógica)

### Etapa 1 — Diagnóstico read-only no app publicado

Adicionar um **painel de diagnóstico temporário** visível apenas para Super Admin, na página `/bancos`, que liste:

- Todos os registros de `banks` retornados pelo hook `useBanks()` (sem filtro), mostrando para cada um:
  - `id`, `name`, `is_active`, `is_invisible`, `initial_balance`
  - Saldo calculado individual (mesma fórmula do card)
- Total dos `initial_balance` de bancos ativos
- Total dos saldos calculados de bancos ativos
- Total exibido pelo hook agregado (`bankId: 'all'`)
- **Diferença entre os dois totais** destacada

Isso revela imediatamente:
- Se há um 3º banco ativo
- Qual banco contribui com os R$ 96,83
- Se a divergência vem de `initial_balance` ou de transações

### Etapa 2 — Investigação adicional, se Etapa 1 não for conclusiva

Se todos os bancos ativos somarem exatamente o total, a divergência está nas transações. Nesse caso o painel também mostra:

- Quantidade de transações pagas no ano por banco (individual) vs total agregado
- Lista de transações pagas no ano cujo `bank_id` **não pertence** à lista de bancos ativos visíveis (órfãs)

### Etapa 3 — Após identificar a causa

- Documentar a causa raiz
- Remover o painel de diagnóstico
- Propor correção (se for bug) ou orientação ao usuário (se for dado inconsistente, ex: banco esquecido ativo)

---

## Arquivos envolvidos

- **Novo:** `src/components/banks/BankBalanceDiagnosticPanel.tsx` — painel read-only, visível só para Super Admin
- **Editar:** `src/pages/Banks.tsx` — renderizar o painel condicionalmente (após o card de saldo total)

Nenhuma alteração em hooks, queries, fórmulas, RLS ou schema. Apenas leitura e exibição.

---

## Fora de escopo

- Qualquer alteração em `useBankTransactions`, `useBanks`, triggers SQL ou cálculo de saldo
- Sincronização entre Test e Live
- Mudança visual nos cards atuais