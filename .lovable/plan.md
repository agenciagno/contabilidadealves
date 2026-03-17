

## Plano: Trava de 4 Dígitos no Ano + Modal de Confirmação de Ano Corrente

### 1. Trava Física de 4 Dígitos — `max` attribute em todos os inputs `type="date"`

Os inputs HTML `type="date"` nativos já suportam o atributo `max` para limitar o ano. Adicionaremos `max="9999-12-31"` e `min="1900-01-01"` em **todos** os inputs de data do sistema. Alguns já possuem (`Transactions.tsx` filtros), mas a maioria não.

**Arquivos afetados:**
- `src/components/transactions/TransactionFormDialog.tsx` — 4 inputs de data (Emissão, Vencimento, Prevista, Pagamento)
- `src/components/banks/BankReportModal.tsx` — 2 inputs
- `src/components/banks/BankDetailSheet.tsx` — 2 inputs
- `src/components/banks/UnifiedStatementAccordion.tsx` — 2 inputs
- `src/components/transactions/CashFlowReportModal.tsx` — 2 inputs
- `src/components/contacts/ContactFormDialog.tsx` — 1 input
- `src/components/recurring/RecurringFormDialog.tsx` — inputs de data

Cada input receberá `max="9999-12-31" min="1900-01-01"`.

### 2. Modal de Confirmação de Ano Corrente — `TransactionFormDialog.tsx`

**Novo estado:** `yearWarningData` (array de datas fora do ano corrente) e `pendingSubmitData` (payload aguardando confirmação).

**Lógica no `handleSubmit`:**
1. Após validação de formato, verificar se alguma data tem ano diferente de `new Date().getFullYear()`.
2. Se sim, armazenar o payload em estado e abrir um `AlertDialog` com:
   - Mensagem: "Atenção: Uma ou mais datas informadas estão fora do ano corrente. Deseja realmente prosseguir com este lançamento?"
   - Lista das datas divergentes (ex: "Data de Vencimento — 23/12/2020")
   - Botão "Cancelar" → fecha o alerta, mantém formulário
   - Botão "Confirmar Lançamento" → executa `onSubmit` com o payload armazenado
3. Se todas as datas são do ano corrente, executa `onSubmit` normalmente.

**Componente usado:** `AlertDialog` já existente em `src/components/ui/alert-dialog.tsx`.

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/TransactionFormDialog.tsx` | Modal de confirmação + `max`/`min` nos inputs de data |
| `src/components/banks/BankReportModal.tsx` | `max`/`min` nos inputs |
| `src/components/banks/BankDetailSheet.tsx` | `max`/`min` nos inputs |
| `src/components/banks/UnifiedStatementAccordion.tsx` | `max`/`min` nos inputs |
| `src/components/transactions/CashFlowReportModal.tsx` | `max`/`min` nos inputs |
| `src/components/contacts/ContactFormDialog.tsx` | `max`/`min` nos inputs |
| `src/components/recurring/RecurringFormDialog.tsx` | `max`/`min` nos inputs |

Nenhuma migration de banco necessária.

