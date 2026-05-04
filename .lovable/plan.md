
# Ajustes Visuais — /movimentacoes

## 1. Cabecalho Responsivo (`src/pages/Transactions.tsx`, linhas 811-839)

**Desktop (>1200px):** manter layout atual (titulo a esquerda, botoes a direita).

**Tablet/Mobile (<1200px):** reorganizar com `flex-col-reverse`:
- Linha 1 (topo): botoes Exportar, Importar, Nova Movimentacao — `flex-wrap gap-2 w-full`
- Linha 2: KPI cards (ver item 2)
- Linha 3: toolbar de filtros

Usar classes Tailwind: `xl:flex-row flex-col-reverse` no container do header, e `w-full xl:w-auto` nos botoes.

## 2. KPI Cards Compactos (linhas 842-912)

- Grid: `grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7`
- Compactar todos os cards em todos os breakpoints:
  - CardContent padding: `p-[10px_12px]` (era `p-3`)
  - Label: `text-[11px] font-semibold` (era `text-xs`)
  - Valor principal: `text-lg` (era `text-base`)
  - Subtitulo: `text-[10px]` (ja esta)

## 3. Tabela — Compactacao das Linhas (linhas 1098-1167)

- Remover o bloco de tipo (Receita/Despesa) que aparece abaixo do nome do cliente (linhas 1115-1121 — o `div` com `transaction.bank` e `transaction.type`). Manter apenas o nome do cliente e badge "Vencido".
- Checkbox: adicionar `h-[18px] w-[18px]`
- Padding vertical das linhas: `py-[10px]` (era `py-3`)
- Colunas de data: adicionar `w-[88px] text-[12px]`
- Status badge: `text-[11px] px-2 py-0.5`
- Colunas Valor/Recebido: `text-[13px] min-w-[110px]`
- Icones de acoes: `w-4 h-4` (era `w-3.5 h-3.5`), botoes `h-7 w-7` com `gap-1.5`

## 4. Tabela — Scroll Horizontal Responsivo

- No container da tabela (linha 1030-1032), adicionar classe `relative` e um pseudo-elemento `::after` via CSS para fade gradient no lado direito.
- Tabela interna: `min-w-[720px]`
- Container: `overflow-x-auto w-full`
- Adicionar CSS em `src/index.css` para o fade gradient:
```css
.table-scroll-container {
  position: relative;
}
.table-scroll-container::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to right, transparent, var(--apple-bg-base));
  pointer-events: none;
  z-index: 5;
}
```

## 5. Modal "Nova Transacao" (`src/components/transactions/TransactionFormDialog.tsx`)

- DialogContent (linha 444): mudar `sm:max-w-2xl` para `sm:max-w-[580px]`
- Adicionar classes de estilo vidro: `bg-[rgba(22,22,26,0.85)] backdrop-blur-[24px] border-white/[0.08] rounded-2xl`
- Padding do form: `p-6` (24px)
- Gap entre grupos: `space-y-5` (20px, era `space-y-3`)
- Gap entre label e input: `space-y-1.5` (6px, era `space-y-1`)
- Gap entre campos lado a lado: `gap-3` (12px, ja esta)
- Reorganizar datas (linhas 550-573) de 1 linha de 3-4 para 2 linhas de 2:
  - Linha 1: `grid-cols-2` — Emissao | Vencimento
  - Linha 2: `grid-cols-2` — Prevista | Pagamento

---

## Arquivos Modificados

| Arquivo | Mudancas |
|---------|----------|
| `src/pages/Transactions.tsx` | Header responsivo, KPI compactos, tabela compacta, scroll container |
| `src/components/transactions/TransactionFormDialog.tsx` | Modal vidro, largura 580px, datas 2x2 |
| `src/index.css` | Classe `.table-scroll-container::after` fade gradient |
