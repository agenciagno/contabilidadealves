
Diagnóstico confirmado (causa raiz):
1) O problema principal não está mais na comparação do filtro (`===`), e sim na base renderizada no frontend.
2) Há warning no console de chaves duplicadas na lista (`Encountered two children with the same key ...`), com IDs de transação repetidos no render.
3) A origem disso está no `useTransactions`: paginação com `.range(...)` ordenando por `date`, porém no banco **3506 de 3508** transações têm `date = null`.  
   Resultado: paginação não determinística (offset em coluna não única) => mesmos registros entram em páginas diferentes => duplicação no array => UI “mistura” linhas e parece que filtro “vaza” (ex.: Deisiane/Denio aparecendo indevidamente).

Plano de correção definitiva:
1) Corrigir a paginação em `src/hooks/useTransactions.ts`
- Trocar ordenação da query paginada para ordenação estável e única:
  - `.order('created_at', { ascending: false })`
  - `.order('id', { ascending: false })` (desempate)
- Manter `.range(from, from + PAGE_SIZE - 1)` com essa ordenação estável.
- Após concatenar páginas, aplicar deduplicação por `id` (Map/Set) como proteção adicional.

2) Blindar a camada de tela em `src/pages/Transactions.tsx`
- Manter filtro estrito já correto para contato:
  - `t.contact_id === columnFilters.contactId`
- Manter `contactId` e `eventName` mutuamente exclusivos.
- Adicionar uma sanitização defensiva (`dedupe por id`) antes do pipeline de filtros para impedir impacto visual caso qualquer regressão de dados ocorra.

3) Ajuste de UX para evitar seleção equivocada em “Cliente / Evento”
- No popover, manter separação explícita entre:
  - “Clientes / Fornecedores”
  - “Eventos (sem contato)”
- Exibir indicador textual do filtro ativo (ex.: “Filtrando por cliente: X” / “Filtrando por evento: Y”), para evitar confusão de seleção.

4) Validação de aceite (obrigatória)
- Console sem warnings de key duplicada.
- Selecionando “ACADEMIA NUTRIVIDA LTDA” deve retornar somente `contact_id` dessa entidade.
- “DEISIANE” e “DENIO” não podem aparecer nesse cenário.
- “Limpar filtros de coluna” precisa zerar completamente e voltar ao resultado integral sem resíduos.
