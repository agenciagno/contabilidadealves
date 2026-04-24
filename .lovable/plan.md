## Plano: Corrigir layout dos relatórios PDF

### Diagnóstico

**1. Resumo por Evento Contábil (Conta Corrente + Pagar/Receber)** — imagem 1
- O cabeçalho da tabela (`Evento | Qtd | A Receber | A Pagar | Saldo`) não tem `halign` definido em `headStyles`, então fica alinhado à esquerda por padrão. Mas o corpo usa `halign: 'right'` para valores. Isso causa o "descasamento" entre o título da coluna e os valores.
- Faltam larguras explícitas de coluna, então o autoTable distribui de forma desigual e o "Evento" ocupa metade da página enquanto os valores ficam todos comprimidos no canto direito.

**2. PDF da DRE** — imagem 2
- Os textos aparecem com letras espaçadas ("S e r v i ç o s   d e   t e r c e i r o s"). Causa raiz: a coluna 0 está fixada em `cellWidth: 70` mm, mas o autoTable está aplicando justify ao quebrar texto longo. Combinado com o caractere `↳` (seta), o jsPDF entra em modo de posicionamento per-caractere.
- A coluna "Evento Contábil" precisa caber labels longos sem distorção. Colunas de valor à direita estão estreitas demais para "R$ 43.075,06".
- Cabeçalho com `halign: 'left'` (padrão) enquanto o corpo usa `halign: 'right'` — mesmo descasamento da Conta Corrente.

---

### Mudanças (apenas visual, sem alterar lógica/cálculos)

**`src/components/banks/BankReportModal.tsx`** (bloco "Resumo por Evento Contábil" no PDF, ~linhas 248-285):
- Adicionar em `headStyles`: `halign: 'center'` (para títulos centralizados) e `valign: 'middle'`.
- Adicionar `columnStyles` com larguras explícitas:
  - Evento: `cellWidth: 70` (esquerda)
  - Qtd: `cellWidth: 18` (centro)
  - Entradas, Saídas, Saldo: `cellWidth: 32` cada (direita)
- Adicionar `halign: 'left'` no `columnStyles[0]` (Evento) para alinhar texto longo à esquerda.
- Aplicar mesmas larguras no `foot` (TOTAL).

**`src/components/transactions/CashFlowReportModal.tsx`** (bloco "Resumo por Evento Contábil" no PDF, ~linhas 295-339):
- Mesmas correções acima:
  - `headStyles.halign = 'center'`, `valign: 'middle'`
  - `columnStyles[0]`: `cellWidth: 80, halign: 'left'`
  - `columnStyles[1]`: `cellWidth: 18, halign: 'center'` (Qtd)
  - `columnStyles[2-4]`: `cellWidth: 38, halign: 'right'` (A Receber, A Pagar, Saldo) — landscape comporta mais largura.

**`src/components/reports/DREReportModal.tsx`** (PDF da DRE, ~linhas 163-214):
- Ajustar `columnStyles` para caber valores em R$ sem espaçamento forçado:
  - 0 (Evento Contábil): `cellWidth: 60, halign: 'left', overflow: 'linebreak'`
  - 1 (Previsto): `cellWidth: 26, halign: 'right'`
  - 2 (Realizado): `cellWidth: 26, halign: 'right'`
  - 3 (RXP): `cellWidth: 26, halign: 'right'`
  - 4 (% Prev.): `cellWidth: 19, halign: 'right'`
  - 5 (% Real.): `cellWidth: 19, halign: 'right'`
  - Total ≈ 176 mm (cabe em A4 retrato com margem 14 mm em cada lado).
- Adicionar em `headStyles`: `halign: 'center'`, `valign: 'middle'`.
- Adicionar em `styles`: `overflow: 'linebreak'`, `cellWidth: 'wrap'` removido — usar apenas valores explícitos por coluna para evitar o "stretch" que causa o letter-spacing.
- Substituir o caractere `↳` (que dispara fallback de fonte no jsPDF Helvetica) por `"  • "` (espaço + bullet) no `flatRows` (linha 71). O bullet está no encoding padrão da Helvetica e não causa per-char positioning.
- Remover `fontStyle: 'bold'` global das linhas Macro nas colunas de valor — manter bold apenas no rótulo (coluna 0). Isso evita que números longos como "R$ 43.075,06" sejam renderizados em bold + cell estreita, o que é outra causa visual de espaçamento.

### Impacto
- Apenas visual: cabeçalhos e colunas alinham corretamente, texto da DRE volta a renderizar normalmente sem espaçamento entre letras.
- Nenhuma alteração em cálculos, queries, hooks, ordem de cards, ou conteúdo dos dados.
- 3 arquivos editados, 0 migrations.
