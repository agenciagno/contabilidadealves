

## Plano: Atualizar Modelo e Lógica de Importação de Planilha

### Problema Identificado

O modelo atual de importação **não possui a coluna "Valor Pago/Recebido"** (`paid_amount`). Isso significa que transações importadas com status "Pago" ficam sem `paid_amount`, e a função `isEffectivelyPaid()` as trata como **Pendentes** (pois exige `is_paid && date && paid_amount != null`). Os dados da planilha não são soberanos.

### Alterações

**Arquivo: `src/components/transactions/ImportSpreadsheetDialog.tsx`**

1. **Adicionar coluna ao modelo** — Inserir `'Valor Pago/Recebido'` no array `TEMPLATE_HEADERS` (após "Valor" ou após "Status"), resultando em 12 colunas.

2. **Parsear o novo campo** — No loop de processamento (linha ~282-318), ler `get('Valor Pago/Recebido')` com `parseAmount()`.

3. **Incluir `paid_amount` no payload** — Lógica:
   - Se a coluna "Valor Pago/Recebido" estiver preenchida na planilha → usar esse valor (dados soberanos).
   - Se estiver vazia E status for "Pago" → default para o valor original (`amount`).
   - Se estiver vazia E status for "Pendente" → `null`.

4. **Adicionar coluna "Valor Pago" na tabela de revisão (Step 3)** — Exibir o `paid_amount` na preview antes da confirmação.

5. **Ajustar validação de headers** — Manter a validação flexível nos primeiros 4 headers obrigatórios (sem quebrar compatibilidade com planilhas antigas).

### Resultado Esperado

- Novo modelo Excel com 12 colunas incluindo "Valor Pago/Recebido"
- Dados da planilha são soberanos: status, datas, valores e paid_amount importados exatamente como preenchidos
- Transações marcadas "Pago" com `paid_amount` + `date` preenchidos são corretamente reconhecidas como pagas pelo sistema (`isEffectivelyPaid`)

