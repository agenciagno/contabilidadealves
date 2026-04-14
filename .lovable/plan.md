

## Plano: Corrigir Importação — Tolerância a "Valor" Vazio + Relatório de Linhas com Falha

### Problema

Linha 311: `if (amount == null) continue;` descarta toda linha sem "Valor", **mesmo que seja PAGO/RECEBIDO** (onde "Valor" não é obrigatório, pois o "Valor Pago/Recebido" é o campo relevante).

### Correção (1 arquivo)

**`src/components/transactions/ImportSpreadsheetDialog.tsx`**

**A. Lógica de parsing (linhas ~300-356):**
- Ler `statusRaw` e `paymentDateStr` **antes** de verificar `amount`
- Nova regra de skip: pular a linha **apenas** se `amount == null` **E** a transação **não** for PAGO/RECEBIDO (ou seja, não tem status pago nem data de pagamento nem valor pago/recebido)
- Quando `amount` for null mas for PAGO, usar `paid_amount` como fallback para `amount` (o banco exige `amount NOT NULL`)

**B. Coletar linhas com falha:**
- Criar estado `skippedRows: { rowNumber: number; reason: string }[]`
- No loop, ao pular uma linha, registrar o número da linha (idx + 2, pois header = linha 1) e o motivo
- Motivos possíveis: "Valor vazio/inválido em transação Pendente", "Valor e Valor Pago ambos vazios"

**C. UI — Step 3 com aba de erros:**
- Antes da tabela de preview, se `skippedRows.length > 0`, mostrar um bloco colapsável (ou alerta) com:
  - Título: `"⚠ {N} linha(s) ignorada(s)"`
  - Lista: `Linha X: motivo`
- Manter o toast existente também

### Lógica refatorada (pseudocódigo)

```typescript
const amount = parseAmount(get('Valor'));
const rawPaidAmount = parseAmount(get('Valor Pago/Recebido'));
const statusRaw = String(get('Status (Pendente ou Pago)') ?? '').trim().toLowerCase();
const hasPaymentDate = !!paymentDateStr;
const isPaid = statusRaw.includes('pago') || hasPaymentDate;

// Nova validação: se não é pago, Valor é obrigatório
if (amount == null && !isPaid && rawPaidAmount == null) {
  skipped.push({ row: idx + 2, reason: 'Valor vazio — transação Pendente' });
  continue;
}
// Se pago mas ambos vazios
if (amount == null && rawPaidAmount == null) {
  skipped.push({ row: idx + 2, reason: 'Valor e Valor Pago/Recebido ambos vazios' });
  continue;
}

const finalAmount = amount != null ? Math.abs(amount) : Math.abs(rawPaidAmount!);
```

### Resumo
- 1 arquivo editado
- 0 migrations
- Corrige a rejeição indevida de 203 linhas PAGO/RECEBIDO sem "Valor"
- Adiciona relatório visual das linhas que realmente falharam

