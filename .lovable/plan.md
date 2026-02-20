

# Juros e Multa a Partir do 5o Dia - Honorarios Contabeis

## Resumo

Alterar a regra de juros/multa para aplicar somente a partir do 5o dia de atraso, exibir valor original + juros/multa + total de forma detalhada, e abrir um modal de confirmacao ao marcar como pago perguntando qual valor foi efetivamente recebido.

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Alterar calculo (>= 5 dias), exibir 3 valores na coluna, adicionar modal de confirmacao ao pagar |

---

## 1. Alterar Regra de Calculo (linha 161)

**Atual**: `if (diasAtraso > 0)` - aplica desde o 1o dia
**Novo**: `if (diasAtraso >= 5)` - aplica a partir do 5o dia

Adicionar campos `jurosValue` e `multaValue` ao objeto de retorno para exibicao detalhada.

```typescript
if (diasAtraso >= 5) {
  const multa = amt * 0.02;
  const juros = amt * 0.0015 * diasAtraso;
  displayAmount = amt + multa + juros;
  hasJuros = true;
  // novos campos:
  jurosValue = juros;
  multaValue = multa;
}
```

---

## 2. Exibicao Detalhada na Coluna Valor

Quando `hasJuros = true`, exibir 3 linhas empilhadas:

```text
R$ 1.500,00          (valor original, text-muted-foreground, text-[10px])
J+M: R$ 45,75        (juros + multa somados, text-amber-500, text-[10px])
R$ 1.545,75          (total, text-emerald-500, font-bold)
```

O tooltip no icone de alerta detalhara: "Multa 2%: R$ XX,XX | Juros 0,15%/dia (X dias): R$ XX,XX"

---

## 3. Modal de Confirmacao ao Marcar como Pago

Criar um Dialog simples dentro do proprio `CashFlowTab.tsx`. Ao clicar no badge de status de uma transacao com `hasJuros`:

- Ao inves de chamar `togglePaid.mutate()` diretamente, abrir o modal
- O modal exibe:
  - Titulo: "Confirmar Recebimento"
  - Texto: "O cliente [Nome] pagou o valor original ou com juros e multa?"
  - Dois botoes:
    - **"Valor Original - R$ 1.500,00"** (outline)
    - **"Com Juros e Multa - R$ 1.545,75"** (primary)
  - Ambos chamam `togglePaid.mutate({ id, is_paid: true })` (o calculo e apenas visual, nao persiste)
- Para transacoes sem juros, manter o comportamento atual (toggle direto)

### Estado necessario:

```typescript
const [confirmModal, setConfirmModal] = useState<{
  open: boolean;
  row: typeof rows[0] | null;
}>({ open: false, row: null });
```

### Logica do click no badge:

```typescript
onClick={() => {
  if (!row.is_paid && row.hasJuros) {
    setConfirmModal({ open: true, row });
  } else {
    togglePaid.mutate({ id: row.id, is_paid: !row.is_paid });
  }
}}
```

---

## Secao Tecnica

### Imports adicionais:
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` de `@/components/ui/dialog`

### Estrutura do modal:

```text
+--------------------------------------------+
|  Confirmar Recebimento                 [X] |
|--------------------------------------------|
|  O cliente "Nome" pagou o valor original   |
|  ou com juros e multa?                     |
|                                            |
|  [Valor Original R$ 1.500,00]              |
|  [Com Juros e Multa R$ 1.545,75]           |
+--------------------------------------------+
```

Ambos os botoes fecham o modal e chamam `togglePaid.mutate`.

