## Diagnóstico

A divergência **não é um erro de cálculo**, é **truncamento silencioso de dados** na consulta ao banco.

O Supabase/PostgREST tem um teto padrão de **1000 linhas por request**. As três queries em `src/hooks/useDREData.ts` (`dre-previsto`, `dre-realizado`, `dre-fluxo-caixa`) usam `.select(...).gte().lte()` direto, sem paginação.

Conferi no banco para o período 01/01/2026 → 30/06/2026:

- Transações com `expected_date` no período (base do **Previsto**): **2.099 linhas** → vêm só **1.000**, faltam ~1.099.
- Transações pagas com `date` no período (base do **Realizado** e **Fluxo de Caixa**): **1.827 linhas** → vêm só **1.000**, faltam ~827.

Quando você filtra mês a mês, cada mês tem menos de 1000 linhas, então a soma vem completa. Quando filtra 6 meses, o backend devolve apenas as 1000 primeiras e o restante é descartado — por isso o semestre fica **menor** que a soma dos meses individuais. Isso afeta **todas as linhas da DRE** (Receitas, Custo com Pessoal, Despesas, Receita Líquida, Lucro Bruto, Fluxo de Caixa, etc.), não só Receitas Operacionais.

Esse padrão já está documentado na memória do projeto (`Query Pagination Pattern` — iterar com `.range()` para ultrapassar o limite de 1000). A DRE foi escrita antes dessa regra e ficou de fora.

## Correção

Em `src/hooks/useDREData.ts`, substituir as três `useQuery` por buscas paginadas via `.range(from, to)` em loop até esgotar (mesmo padrão usado nos hooks de transações/relatórios).

Passos:

1. Criar um helper local `fetchAllPaged<T>(buildQuery)` que:
   - Executa `buildQuery().range(from, from + 999)` em loop.
   - Concatena resultados.
   - Para quando o último lote vier com menos de 1000 linhas.
   - Adiciona `.order('id', { ascending: true })` para paginação estável (alinhado com a memória `Stable Pagination`).
2. Reescrever as três queries (`dre-fluxo-caixa`, `dre-previsto`, `dre-realizado`) para usar esse helper.
3. Manter exatamente os mesmos `select`, filtros (`deleted_at is null`, `is_paid`, `date`/`expected_date`), e a regra extra de Previsto (`!is_paid || date no período`) intacta.
4. Não mexer em nada de cálculo, estrutura, UI, `DRECard`, página `DRE.tsx`, RLS, etc.

## Validação após implementação

- Conferir no preview que, com filtro 01/01/2026 → 30/06/2026, `Receitas Operacionais` bate com a soma mês a mês:
  - Previsto ≈ R$ 348.596,35
  - Realizado ≈ R$ 516.946,14
  - RxP ≈ R$ 168.349,79
- Conferir uma segunda seção (ex.: `Custo com Pessoal` ou `Despesas Fixas`) para garantir que o efeito cascata também sumiu nas linhas calculadas (Receita Líquida, Lucro Bruto, Lucro Líquido, Fluxo de Caixa).

## Arquivos alterados

- `src/hooks/useDREData.ts` (único arquivo).

Nenhuma migração de banco, nenhuma mudança em RLS, regra de negócio, estrutura da DRE ou UI.
