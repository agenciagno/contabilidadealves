

# Preview Intermediario na Importacao de Planilha

## Resumo

Adicionar um Step 3 (Preview) entre o upload e a confirmacao final. Apos o upload processar os dados, ao inves de importar diretamente, exibir uma tabela com os lancamentos lidos para o usuario revisar, com opcao de confirmar ou voltar.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/ImportSpreadsheetDialog.tsx` | Adicionar step 3 com tabela de preview, separar parsing de importacao |

---

## Mudancas Detalhadas

### 1. Novo estado para armazenar dados parseados

```typescript
const [parsedData, setParsedData] = useState<TransactionInsert[]>([]);
```

### 2. Alterar `processFile` para nao importar direto

Em vez de chamar `onImport(transactions)` ao final do parsing, salvar em `setParsedData(transactions)` e avancar para `setStep(3)`.

### 3. Step indicator com 3 passos

Adicionar terceiro circulo "Revisar" no indicador de progresso (Modelo -> Upload -> Revisar).

### 4. Step 3: Tabela de Preview

- Dialog expandido para `sm:max-w-4xl` quando no step 3
- Contador: "X lancamento(s) encontrado(s)"
- Tabela com ScrollArea (max-height ~400px) contendo colunas:
  - Data | Cliente | Tipo | Valor | Status | Vencimento | Banco | Categoria
- Cada linha mostra dados legivel (data formatada dd/MM/yyyy, valor em R$, tipo como badge colorido Receita/Despesa, status como badge Pago/Pendente)
- Lookup reverso de bank_id/category_id/contact_id para exibir nomes (ou "---" se nao vinculado)
- Botoes: "Voltar" (ghost, volta ao step 2) e "Confirmar Importacao" (primary, chama onImport)
- Ao confirmar: spinner de "Importando..." e fluxo existente de toast + fechar modal

### 5. Ajuste no resetState

Incluir `setParsedData([])` no reset.

### 6. DialogDescription dinâmica

Step 3 exibe: "Revise os dados antes de confirmar"

---

## Secao Tecnica

### Lookup reverso para exibicao

Para mostrar nomes na tabela de preview ao inves de IDs:

```typescript
const bankName = (id: string | null) => banks.find(b => b.id === id)?.name ?? '—';
const categoryName = (id: string | null) => categories.find(c => c.id === id)?.name ?? '—';
const contactName = (id: string | null) => contacts.find(c => c.id === id)?.name ?? '—';
```

### Formatacao na tabela

```typescript
// Data: format(parseISO(row.date), 'dd/MM/yyyy')
// Valor: row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// Tipo: Badge verde "Receita" ou vermelho "Despesa"
// Status: Badge "Pago" ou "Pendente"
```

### Handler de confirmacao

```typescript
const handleConfirmImport = async () => {
  setIsProcessing(true);
  try {
    await onImport(parsedData);
    toast({ title: `${parsedData.length} lançamento(s) importado(s) com sucesso!` });
    handleClose(false);
  } catch (err) {
    toast({ title: 'Erro ao importar.', variant: 'destructive' });
  } finally {
    setIsProcessing(false);
  }
};
```

