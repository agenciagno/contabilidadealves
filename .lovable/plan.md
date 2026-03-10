

## Compactar cards de resumo no relatório de Bancos

**Problema**: Os 4 cards (Saldo Inicial, Entradas, Saídas, Saldo Final) no preview e no PDF estão grandes demais.

### Alterações em `src/components/banks/BankReportModal.tsx`

**1. Preview (linhas 460-486)** — Trocar o grid 2x2 com `p-3` por um grid 4 colunas inline compacto:
- Grid `grid-cols-4 gap-2`
- Padding reduzido para `p-2`
- Fonte do valor: `text-xs` em vez de `text-sm`
- Remover ícones (TrendingUp, TrendingDown, Wallet) dos cards para economizar espaço

**2. PDF (linhas 110-175)** — Compactar os cards de 2x2 para 4 colunas lado a lado:
- 4 cards em uma única linha horizontal
- Largura de cada card: ~43mm
- Altura reduzida de 20mm para 14mm
- Font sizes reduzidos proporcionalmente

Nenhuma alteração na estrutura da tabela, rodapé ou lógica de exportação.

