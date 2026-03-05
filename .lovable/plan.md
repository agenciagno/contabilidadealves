

## Plano: Corrigir Filtro Cliente/Evento Não Aplicando à Lista

### Diagnóstico

O `handleOpenChange(false)` usa `tempContacts` e `tempEvents` da closure. Embora React recrie a função a cada render, há um cenário onde o Radix `onOpenChange` pode capturar uma versão stale da função (ex: se o popover fecha antes do re-render causado pelo último `setTempContacts` ser commitado). Isso faz com que os valores aplicados ao `setColumnFilters` sejam os valores antigos (possivelmente vazios — os valores iniciais sincronizados do pai).

### Solução

Usar `useRef` para sempre ter acesso aos valores mais recentes de `tempContacts` e `tempEvents`, independente do ciclo de render:

**Em `ContactEventMultiFilter` (~linhas 145-278 de `src/pages/Transactions.tsx`):**

1. Adicionar refs que espelham os estados temporários:
   ```ts
   const tempContactsRef = useRef(tempContacts);
   const tempEventsRef = useRef(tempEvents);
   // Manter sincronizado
   tempContactsRef.current = tempContacts;
   tempEventsRef.current = tempEvents;
   ```

2. No `handleOpenChange(false)`, ler dos refs em vez do state:
   ```ts
   const contacts = tempContactsRef.current;
   const events = tempEventsRef.current;
   setColumnFilters(prev => {
     const n = { ...prev };
     if (contacts.length) n.contactIds = contacts; else delete n.contactIds;
     if (events.length) n.eventNames = events; else delete n.eventNames;
     return n;
   });
   ```

3. Adicionar um botão "Aplicar" visível dentro do popover para dar controle explícito ao usuário (UX complementar), que chama a mesma lógica de aplicar filtros e fecha o popover.

### Arquivo impactado
- `src/pages/Transactions.tsx` — ~15 linhas alteradas no `ContactEventMultiFilter`

