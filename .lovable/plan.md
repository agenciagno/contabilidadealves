

# Importacao em Massa via Excel (XLSX) - Pagina Lancamentos

## Resumo

Criar funcionalidade completa de importacao de transacoes via planilha Excel (.xlsx/.xls) com wizard de 2 passos: download do modelo e upload com drag-and-drop. Inclui validacao, mapeamento de dados e feedback visual.

---

## Dependencia Nova

Instalar a biblioteca `xlsx` (SheetJS) para leitura e geracao de arquivos Excel no frontend.

---

## Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/transactions/ImportSpreadsheetDialog.tsx` | **Novo** - Modal com wizard de 2 passos |
| `src/pages/Transactions.tsx` | **Editar** - Adicionar botao "Importar Planilha" e integrar o modal |

---

## 1. Novo Componente: ImportSpreadsheetDialog.tsx

### Props

```typescript
interface ImportSpreadsheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banks: Bank[];
  categories: Category[];
  contacts: Contact[];
  onImport: (transactions: TransactionInsert[]) => Promise<void>;
}
```

### Wizard - Step 1: Baixar Modelo

- Titulo: "Importar Planilha"
- Texto de apoio explicando os 3 passos (baixar, preencher, upload)
- Botao "Baixar Planilha Modelo" que gera um .xlsx com cabecalhos usando a lib `xlsx`:
  - Colunas: `Data Prevista`, `Cliente/Fornecedor`, `Tipo (Receita ou Despesa)`, `Valor`, `Status (Pendente ou Pago)`, `Data Vencimento`, `Data Pagamento`, `Conta Bancaria`, `Evento Contabil`, `Historico`
- Botao "Proximo" para avancar ao Step 2

### Wizard - Step 2: Upload

- Area de drag-and-drop estilizada (borda tracejada, icone de upload, texto "Arraste e solte seu arquivo aqui")
- Aceita apenas `.xlsx` e `.xls`
- Input file oculto ativado por clique na area
- Ao selecionar arquivo:
  1. Exibe spinner "Processando..."
  2. Le arquivo com `FileReader` + `xlsx.read()`
  3. Converte primeira aba para JSON
  4. Aplica mapeamento de dados (descrito abaixo)
  5. Chama `onImport` com array de `TransactionInsert`
  6. Exibe toast de sucesso com contagem
  7. Fecha modal

### Mapeamento de Dados (logica interna)

```typescript
// Datas: Excel serial number -> Date
// Se valor for numero, converter com xlsx.SSF ou XLSX.utils.format_cell
// Se string, parsear como dd/MM/yyyy

// Tipo: 'Receita' -> 'receita', 'Despesa' -> 'despesa'

// Status: 'Pago' -> is_paid: true, 'Pendente' -> is_paid: false

// Valor: remover "R$", pontos de milhar, trocar virgula por ponto

// Conta Bancaria: buscar bank por nome (case-insensitive) -> bank_id
// Se nao encontrar, deixar null

// Evento Contabil: buscar category por nome (case-insensitive) -> category_id
// Se nao encontrar, deixar null

// Cliente/Fornecedor: buscar contact por nome (case-insensitive) -> contact_id
// Se nao encontrar, deixar null

// Historico -> notes

// Data Prevista -> date
// Data Vencimento -> due_date
// Data Pagamento -> ignorar (nao existe no schema, apenas informativa)
```

### Tratamento de Erros

- Se arquivo nao tiver cabecalhos esperados: toast de erro "Formato invalido. Use o modelo fornecido."
- Se nenhuma linha valida: toast de erro "Nenhum lancamento valido encontrado."
- Linhas sem Data Prevista ou Valor sao ignoradas silenciosamente

---

## 2. Alteracao: Transactions.tsx

### Botao de Importacao

Adicionar botao "Importar Planilha" ao lado do botao "Exportar", com icone `Upload` do lucide-react:

```typescript
<Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
  <Upload className="w-4 h-4" />
  Importar Planilha
</Button>
```

### Estado e Handler

```typescript
const [importOpen, setImportOpen] = useState(false);

const handleImport = async (transactions: TransactionInsert[]) => {
  for (const t of transactions) {
    await createTransaction.mutateAsync(t);
  }
};
```

### Integracao do Modal

```typescript
<ImportSpreadsheetDialog
  open={importOpen}
  onOpenChange={setImportOpen}
  banks={banks}
  categories={categories}
  contacts={contacts}
  onImport={handleImport}
/>
```

---

## Secao Tecnica

### Conversao de Data Serial do Excel

O Excel armazena datas como numeros seriais (ex: 45678). A biblioteca `xlsx` fornece utilitarios para converter:

```typescript
function excelDateToJSDate(serial: number): string {
  const utc_days = Math.floor(serial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  return format(date, 'yyyy-MM-dd');
}
```

### Geracao do Template

```typescript
import * as XLSX from 'xlsx';

const headers = [
  'Data Prevista', 'Cliente/Fornecedor', 'Tipo (Receita ou Despesa)',
  'Valor', 'Status (Pendente ou Pago)', 'Data Vencimento',
  'Data Pagamento', 'Conta Bancária', 'Evento Contábil', 'Histórico'
];
const ws = XLSX.utils.aoa_to_sheet([headers]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
XLSX.writeFile(wb, 'modelo-lancamentos.xlsx');
```

### UI do Drag-and-Drop

Area com `onDragOver`, `onDragLeave`, `onDrop` handlers. Estado `isDragging` para highlight visual. Input `<input type="file" accept=".xlsx,.xls">` oculto com ref.

### Fluxo de Importacao

```text
Upload -> FileReader.readAsArrayBuffer -> XLSX.read(data)
-> XLSX.utils.sheet_to_json(sheet) -> map rows to TransactionInsert[]
-> loop createTransaction.mutateAsync() -> toast sucesso -> fechar modal
```

