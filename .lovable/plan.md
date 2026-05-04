
# Diagnóstico dos Problemas de Responsividade

Identifiquei **3 causas raiz** para os problemas visíveis nos screenshots:

---

## Problema 1 — Cards KPI empilhados em 1 coluna mas sem compactação adequada

Na viewport das imagens (~375-414px), o grid `grid-cols-1 sm:grid-cols-3` faz cada card ocupar 100% da largura, empilhando verticalmente 8 cards. Isso funciona, mas cada card tem padding excessivo para mobile e os valores ficam grandes demais, forçando scroll longo.

**Correção:** Em mobile (`< 640px`), usar `grid-cols-2` para os KPI cards, com padding e fontes ainda mais compactos (value `text-base` em vez de `text-lg`). Isso reduz o scroll vertical pela metade.

---

## Problema 2 — Regra CSS global de modal quebrando o TransactionFormDialog

A regra em `src/index.css` linha 360-362:
```css
[role="dialog"]:not([data-mobile="true"]):not([data-sidebar]) {
  max-width: min(480px, calc(100vw - 32px)) !important;
}
```
Esta regra está aplicando `480px !important` em **TODOS** os dialogs, incluindo o modal de transação que precisa de `580px`. O `!important` sobrepõe qualquer classe inline.

**Correção:** Remover o `!important` e adicionar um seletor mais específico que exclua modals com classes de largura definida (como `sm:max-w-[580px]`). Ou melhor: aplicar essa restrição apenas em `@media (max-width: 640px)` para não limitar dialogs em desktop/tablet.

---

## Problema 3 — Tabela com scroll container mas sem indicação visual funcional

O `.table-scroll-container::after` cria um fade gradient, mas o `::after` fica **sempre visível** (não tem lógica `has-scroll` como o kanban). Além disso, a tabela está dentro de um container que já tem `overflow-x-hidden` nos pais (`main`, `div`, `html`), o que pode suprimir o scroll interno.

**Correção:** 
- Garantir que o container de scroll da tabela (`overflow-auto`) funcione mesmo com `overflow-x: hidden` nos ancestrais — isso já deveria funcionar pois `overflow-auto` em um descendente cria seu próprio contexto.
- Adicionar lógica condicional ao fade (mostrar apenas quando há scroll) como já existe no kanban.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Transactions.tsx` | Grid KPI: `grid-cols-2 sm:grid-cols-3 ...`; fontes menores em mobile |
| `src/index.css` | Regra `[role="dialog"]`: wrap em `@media (max-width: 639px)` para não afetar desktop; fade gradient condicional na tabela |

Nenhuma lógica, dado, filtro ou funcionalidade será alterada.
