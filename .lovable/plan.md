
## Correção do Botão Refresh em Boletos

### Diagnóstico Completo

O botão de refresh executa corretamente o `refetchControls()` e `refetchContacts()` — os dados chegam atualizados do banco. O problema está em **dois pontos do hook**:

**Problema 1 — `generatingRef` nunca é resetado:**
O `useRef(false)` é definido uma vez e marcado como `true` no primeiro carregamento. Após o refresh, o `useEffect` de Lazy Generation verifica `!generatingRef.current` — mas como ele já é `true`, o efeito nunca dispara novamente para novos contatos.

**Problema 2 — Lazy Generation apaga e recria tudo:**
Mesmo que o efeito disparasse, a lógica atual só funciona quando `boletoControls.length === 0`. Se o mês já tem 5 registros e um novo contato foi habilitado, a condição `boletoControls.length === 0` é `false`, então nada acontece.

**Resultado:** O novo contato aparece em `activeContacts`, mas não tem entrada em `boleto_controls`, então a mesclagem `boletoList` simplesmente não o inclui.

---

### Solução

Substituir a lógica de "geração inicial do mês inteiro" por uma lógica de **sincronização incremental**: detectar quais contatos ativos ainda não têm entrada para o mês e inserir apenas esses registros ausentes.

#### Mudanças em `src/hooks/useBoletoControls.ts`

**1. Remover o `generatingRef`** — ele não é mais necessário com a nova abordagem.

**2. Alterar o `useEffect` para sincronização incremental:**

```typescript
useEffect(() => {
  if (isLoading || generateMonth.isPending) return;
  if (activeContacts.length === 0) return;

  // Encontrar contatos que ainda não têm entrada no mês
  const existingContactIds = new Set(boletoControls.map(bc => bc.contact_id));
  const missingContacts = activeContacts.filter(c => !existingContactIds.has(c.id));

  if (missingContacts.length > 0) {
    generateMonth.mutate(missingContacts);
  }
}, [isLoading, boletoControls.length, activeContacts.length]);
```

Esta abordagem:
- Funciona tanto na primeira carga (mês vazio) quanto após um refresh (novos contatos)
- Não apaga registros existentes
- Não usa `generatingRef` — a própria checagem `missingContacts.length > 0` previne loops

**3. Atualizar a função `refreshAll`** para forçar a invalidação do cache antes de refetching, garantindo que os dados sejam sempre buscados do banco:

```typescript
const refreshAll = async () => {
  queryClient.invalidateQueries({ queryKey: ['boleto-controls', referenceMonth] });
  queryClient.invalidateQueries({ queryKey: ['contacts-boleto-active'] });
  await Promise.all([refetchControls(), refetchContacts()]);
};
```

---

### Comportamento Resultante

| Situação | Comportamento Antes | Comportamento Depois |
|---|---|---|
| Primeiro acesso ao mês | Gera todos os registros ✓ | Gera todos os registros ✓ |
| Refresh sem mudanças | Atualiza dados ✓ | Atualiza dados ✓ |
| Novo contato habilitado + Refresh | Não aparece ✗ | Detecta contato sem entrada → insere → aparece ✓ |
| Contato desabilitado entre refreshes | Continua aparecendo (registro existe) | Continua aparecendo (registro histórico preservado) ✓ |

---

### Arquivo Modificado

| Arquivo | Tipo de Mudança |
|---|---|
| `src/hooks/useBoletoControls.ts` | Substituir lógica de geração inicial por sincronização incremental; melhorar `refreshAll` |

Nenhuma migração de banco de dados necessária. Nenhuma mudança em `Boletos.tsx`.
