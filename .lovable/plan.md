

## Plano: Correção Definitiva do Popover Multi-select

### Diagnóstico

O `ContactEventMultiFilter` (linhas 145-276) já tem estado `open` controlado, mas o problema é que `toggleContact`/`toggleEvent` chamam `setColumnFilters` do componente pai (`Transactions`), o que:
1. Atualiza `serverFilters` (useMemo dependente de `columnFilters`)
2. Dispara `useServerTransactions` → `isFetching` muda → re-render do pai inteiro
3. O ternário na linha 771 (`!isFetching && transactions.length === 0 ? ... : ...`) pode trocar de branch e desmontar a árvore do header, matando o Popover

### Solução

**BLOCO 1+2+3: Extrair componente isolado com estado interno desacoplado**

Refatorar `ContactEventMultiFilter` para **não chamar `setColumnFilters` a cada clique de checkbox**. Em vez disso:

1. Manter seleções temporárias (`tempContactIds`, `tempEventNames`) dentro do componente como estado local.
2. Sincronizar do pai → filho via `useEffect` quando o popover abre (copiar `columnFilters.contactIds` para `tempContactIds`).
3. Aplicar filtros ao pai **somente quando o popover fecha** (no `onOpenChange(false)`), chamando `setColumnFilters` uma única vez.
4. Isso elimina re-renders intermediários e mantém o popover estável.

Alternativamente (mais simples e sem mudar o UX de "filtro ao vivo"):

1. Envolver `ContactEventMultiFilter` com `React.memo` e comparação customizada de props.
2. **Desacoplar a atualização**: usar `useRef` para a flag `open` e `flushSync` ou `startTransition` para tornar a atualização de `columnFilters` non-urgent, evitando que o React desmonte o popover durante o re-render.
3. Adicionar `key` estável ao componente no JSX do header para garantir que React nunca o desmonte.

**Abordagem escolhida**: A mais robusta — manter seleções temporárias localmente e aplicar no fechamento. Isso garante zero re-renders do pai enquanto o popover está aberto.

**Detalhes:**
- Estado interno: `tempContacts: string[]`, `tempEvents: string[]`, `search: string`
- No `onOpenChange(true)`: copiar `columnFilters.contactIds` → `tempContacts`
- Checkboxes operam sobre `tempContacts`/`tempEvents` (estado local, sem prop drilling)
- No `onOpenChange(false)`: chamar `setColumnFilters(prev => ({...prev, contactIds: tempContacts, eventNames: tempEvents}))` e limpar search
- `clearAll`: limpar ambos os arrays temporários (não chama `setColumnFilters` até fechar)
- Badge de contagem: usar `tempContacts.length + tempEvents.length` enquanto aberto
- Input mantém autoFocus e valor preservado (já funciona pois não há re-render externo)

### Arquivo impactado
- `src/pages/Transactions.tsx` — refatorar `ContactEventMultiFilter` (linhas 145-276)

