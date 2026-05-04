## Problema

Quando o usuário seleciona um **Evento Macro** (ex: "Receitas Operacionais") no filtro de categorias, a Versão Completa não mostra nenhum dado porque:

1. As transações estão vinculadas ao **category_id do evento filho** (ex: "Honorários Contábeis")
2. O filtro na linha 295 verifica `monthlySelectedCategories.has(t.category_id)` — compara diretamente com o ID do macro selecionado
3. Como `t.category_id` aponta para o filho, a comparação falha e todas as transações são excluídas

A Versão Resumida tem o mesmo filtro (linha 239) mas funciona porque agrupa por nome da categoria — mesmo que tecnicamente o filtro deveria ter o mesmo problema, o comportamento observado sugere que as transações estão diretamente no macro ou o usuário selecionou o filho.

## Correção

No `monthlyHierarchicalMatrix` (e também no `monthlyMatrix` para consistência), expandir o filtro de categorias selecionadas para incluir os filhos de qualquer macro selecionado:

### Arquivo: `src/components/transactions/CashFlowReportModal.tsx`

1. **Criar um Set expandido de IDs** — antes do filtro de transações em ambos os `useMemo` (`monthlyMatrix` e `monthlyHierarchicalMatrix`):
   - Para cada ID em `monthlySelectedCategories`, verificar se é um macro (tem filhos em `categories`)
   - Se for macro, adicionar todos os IDs dos filhos ao Set expandido
   - Usar esse Set expandido no lugar de `monthlySelectedCategories` no filtro

2. **Atualizar o filtro na linha 239** (resumida) e **linha 295** (completa) para usar o Set expandido

Isso garante que ao selecionar "Receitas Operacionais", transações de "Honorários Contábeis" (filho) também são incluídas, e na Versão Completa aparecem agrupadas corretamente sob o macro.
