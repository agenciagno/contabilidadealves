
# Adicionar Mes Atual ao Titulo "Lucro Previsto"

## Alteracao

Modificar o texto do card "Lucro Previsto" na pagina de Lancamentos para exibir o mes atual dinamicamente.

**De:** `Lucro Previsto`
**Para:** `Lucro Previsto — Fevereiro` (exemplo para o mes atual)

## Arquivo Modificado

| Arquivo | Linha | Mudanca |
|---|---|---|
| `src/pages/Transactions.tsx` | ~539 | Alterar o texto estatico para incluir o mes atual formatado |

## Detalhes Tecnicos

- Usar `format(new Date(), 'MMMM', { locale: ptBR })` do `date-fns` para obter o nome do mes em portugues
- Capitalizar a primeira letra do mes (date-fns retorna em minusculo)
- O `ptBR` locale ja esta importado no arquivo
- O valor atualiza automaticamente quando o mes muda, pois `new Date()` e avaliado a cada render

**Resultado:** `Lucro Previsto — Fevereiro` (atualiza sozinho ao virar o mes)
