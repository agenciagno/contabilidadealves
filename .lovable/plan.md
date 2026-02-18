
## Ajustes no Módulo de Bancos

### Alterações por arquivo

---

### 1. `src/components/banks/BankDetailSheet.tsx`

**Data final padrão = hoje (em vez do último dia do mês):**
```tsx
// ANTES (linha 30):
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
const [endDate, setEndDate] = useState(lastOfMonth);

// DEPOIS:
const todayStr = today.toISOString().split('T')[0];
const [endDate, setEndDate] = useState(todayStr);
```

**Sheet mais larga (sem scroll lateral no extrato):**
```tsx
// ANTES (linha 54):
<SheetContent side="right" className="w-full max-w-4xl p-0 flex flex-col">

// DEPOIS:
<SheetContent side="right" className="w-full sm:max-w-5xl p-0 flex flex-col overflow-hidden">
```

A classe `sm:max-w-5xl` aumenta a largura de `4xl` (56rem) para `5xl` (64rem). A tabela de extrato já usa `flex-1 overflow-auto`, portanto o scroll interno permanece apenas no corpo da tabela, sem scroll na sheet inteira.

---

### 2. `src/components/banks/UnifiedStatementAccordion.tsx`

**Data final padrão = hoje:**
```tsx
// ANTES (linha 28):
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
const [endDate, setEndDate] = useState(lastOfMonth);

// DEPOIS:
const todayStr = today.toISOString().split('T')[0];
const [endDate, setEndDate] = useState(todayStr);
```

---

### 3. `src/components/banks/BankReportModal.tsx`

**Data final padrão = hoje:**
```tsx
// ANTES (linha 44):
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
const [endDate, setEndDate] = useState(lastOfMonth);

// DEPOIS:
const todayStr = today.toISOString().split('T')[0];
const [endDate, setEndDate] = useState(todayStr);
```

**Botões de exportação — remover subtítulos, renomear, layout horizontal:**

Os 4 botões passarão a exibir apenas ícone + título, sem o parágrafo de descrição. Layout `flex-row` em vez de `flex-col`.

| Antes | Depois |
|---|---|
| PDF Gestão | PDF / Impressão |
| Excel Analítico | Excel |
| OFX Contábil | OFX |
| Imagem PNG | Imagem |

```tsx
// Estrutura simplificada de cada botão:
<Button variant="outline" className="flex items-center gap-2 h-10" onClick={exportPDF}>
  <FileText className="w-4 h-4 text-red-500" />
  <span className="text-sm font-medium">PDF / Impressão</span>
</Button>
```

**Exportação Excel — de CSV para XLS:**

A função `exportCSV` será renomeada para `exportXLS`. Em vez de gerar um arquivo `.csv`, gerará um arquivo `.xls` usando o formato HTML-table que o Excel abre nativamente (técnica sem dependências externas):

```tsx
const exportXLS = () => {
  const headers = ['Data', 'Banco', 'Histórico', 'Cliente/Fornecedor', 'Evento Contábil', 'Valor Entrada', 'Valor Saída', 'Saldo'];
  const tableRows = filteredRows.map(r => [/* mesmos dados */]);

  // Gera HTML de tabela que o Excel lê nativamente
  const table = `<table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    ${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
  </table>`;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head><body>${table}</body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `extrato-bancario-${startDate}-${endDate}.xls`;
  a.click();
  URL.revokeObjectURL(url);
};
```

**Exportação Imagem — de PNG para JPEG:**

```tsx
// ANTES:
const url = canvas.toDataURL('image/png');
a.download = `resumo-extrato-${startDate}-${endDate}.png`;

// DEPOIS:
const url = canvas.toDataURL('image/jpeg', 0.92);
a.download = `resumo-extrato-${startDate}-${endDate}.jpg`;
```

---

### Resumo dos arquivos

| Arquivo | Mudanças |
|---|---|
| `BankDetailSheet.tsx` | Sheet mais larga (`max-w-5xl`), data final padrão = hoje |
| `UnifiedStatementAccordion.tsx` | Data final padrão = hoje |
| `BankReportModal.tsx` | Data final padrão = hoje, botões sem subtítulo + renomeados, export XLS e JPEG |

**Total: 3 arquivos**
