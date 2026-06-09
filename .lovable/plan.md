# Plano aprovado (com ajuste na Alteração 1)

## Alteração 1 — "Data Prevista" em transações À Vista (AJUSTADA)

**Onde:** `src/components/transactions/TransactionFormDialog.tsx`

**Comportamento novo (apenas em NOVAS transações À Vista):**
- O campo "Data Prevista" fica **desabilitado** e **vazio**.
- Ao salvar, `expected_date` é gravado como **`null`** (não recebe nenhum valor automático).
- Texto explicativo abaixo do campo: *"Transações À Vista não compõem o Previsto da DRE — apenas o Realizado."*
- Em **À Prazo**, **edição de transação existente** e **liquidação**, nada muda.

**Efeito na DRE:** essas transações deixam de aparecer na coluna **Previsto** (porque a query `dre-previsto` exige `expected_date NOT NULL`) e continuam aparecendo normalmente em **Realizado** (pela data de pagamento).

## Alteração 2 — Relatório de Conciliação DRE × Pagar/Receber (APROVADA)

Botão novo **"Conciliação"** na tela DRE. Modal + PDF, agrupado por Evento Contábil, mostrando para o período selecionado:

```text
Evento | Previsto DRE | Em Aberto (Pagar/Receber) | Pagas c/ Data Prevista no período | Diferença
```

- **Previsto DRE** = soma `amount` com `expected_date` no período (pagas + não pagas).
- **Em Aberto** = mesma soma, `is_paid = false`.
- **Pagas c/ Data Prevista no período** = mesma soma, `is_paid = true` — parte que "some" do Pagar/Receber mas continua no Previsto.
- **Diferença** = Previsto − (Em Aberto + Pagas) → deve ser zero; se não, indica banco invisível ou categoria sem `show_in_dre`.

Cada linha tem botão **"Ver transações"** que expande lista detalhada (Data Prevista, Data de Pagamento, Cliente, Valor, Status).

Nenhuma lógica de cálculo da DRE ou do Pagar/Receber é alterada — somente leitura.

## Alteração 3 — Tooltips informativos (APROVADA)

- **DRE → coluna Previsto (ⓘ):** *"Inclui transações pagas cuja data prevista está no período."*
- **Pagar/Receber → cabeçalho (ⓘ):** *"Mostra apenas transações em aberto. Use a Conciliação na DRE para ver tudo que compõe o Previsto."*

---

## Resumo de impacto

| Item | Muda? |
|---|---|
| Cálculo da DRE | Não |
| Cálculo do Pagar/Receber | Não |
| Saldo de bancos | Não |
| Transações já existentes | Não |
| Nova À Vista | `expected_date = null` (campo travado e vazio) |
| Nova À Prazo / Edição / Liquidação | Não muda |
| Nova tela | Botão "Conciliação" na DRE (modal + PDF) |
| Tooltips | DRE + Pagar/Receber |

Pronto para implementar. Posso seguir?
