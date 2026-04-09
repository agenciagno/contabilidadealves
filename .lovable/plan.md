

## Plano: Adicionar RXP nos cards e linha "Fluxo de Caixa" na tabela DRE

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/pages/DRE.tsx` | Adicionar linha RXP no `SummaryCard` e linha "Fluxo de Caixa" após `lucro_liquido` na tabela |
| 2 | `src/hooks/useDREData.ts` | Expor `fluxoCaixa` com previsto/realizado no summary para calcular RXP |

### Detalhes

**1. `SummaryCard` — adicionar RXP**

Cada card passa a mostrar 3 linhas: Previsto, Realizado e RXP (Realizado - Previsto), com cor condicional (verde positivo, vermelho negativo).

**2. Card "Fluxo de Caixa" — RXP**

O card de Fluxo de Caixa hoje usa o mesmo valor para previsto e realizado. Mantém assim (RXP = R$ 0,00) pois fluxo de caixa é saldo bancário real, sem previsão.

**3. Linha "Fluxo de Caixa" na tabela DRE**

Adicionar uma última linha após "Lucro/Prejuízo Líquido" com estilo especial (semelhante ao PDF), exibindo o saldo bancário total nas colunas Previsto e Realizado. Será adicionada como uma `DRECalculatedRow` com key `fluxo_caixa` no `DRE_STRUCTURE` do hook, e o cálculo usará o saldo bancário total (excluindo bancos invisíveis).

### Resumo
- 2 arquivos editados
- 0 migrations

