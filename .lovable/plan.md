
## Plano Revisado: Reorganização do Modal de Nova Movimentação

### Objetivo
Reestruturar o layout do formulário de transação removendo o campo "Descrição" e organizando os campos restantes em 5 linhas lógicas.

---

### Nova Estrutura do Layout (SEM Descrição)

```text
┌─────────────────────────────┬─────────────────────────────┐
│  TABS: Despesa / Receita                                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────┬─────────────────────────────┐
│  Cliente/Fornecedor (50%)   │  Valor (50%)                │
└─────────────────────────────┴─────────────────────────────┘
┌─────────────────────────────┬─────────────────────────────┐
│  Evento Contábil (50%)      │  Conta/Banco (50%)          │
└─────────────────────────────┴─────────────────────────────┘
┌─────────────────────────┬─────────────────────────┬───────┐
│  Data da Transação      │  Data de Vencimento     │ Anexo │
│         (33%)           │        (33%)            │ (33%) │
└─────────────────────────┴─────────────────────────┴───────┘
┌─────────────────────────────────────────────────────────────┐
│  Observações (100% largura, altura reduzida - 1 linha)      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Switch: Pago/Recebido                                      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────┬─────────────────────────────┐
│  Cancelar                   │  Salvar                     │
└─────────────────────────────┴─────────────────────────────┘
```

---

### Alterações Detalhadas

#### Arquivo: `src/components/transactions/TransactionFormDialog.tsx`

**1. Remover estado e referências ao campo Descrição**

| Linha | Ação |
|-------|------|
| 58 | Remover: `const [description, setDescription] = useState('');` |
| 87 | Remover: `setDescription(transaction.description);` |
| 99 | Remover: `setDescription('');` |
| 129 | Alterar: `description` no objeto de submit será gerado automaticamente |
| 194 | Alterar validação: remover `description.trim()` da condição |

**2. Gerar descrição automaticamente**

Na submissão, a descrição será gerada a partir do nome do evento contábil selecionado:
```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const selectedCategory = filteredCategories.find(c => c.id === categoryId);
  const autoDescription = selectedCategory?.name || 'Movimentação';
  
  onSubmit({
    type,
    description: autoDescription,
    amount: parseCurrencyInput(amount),
    // ... resto dos campos
  } as TransactionInsert, pendingFiles);
};
```

**3. Reestruturar layout do formulário**

Substituir o grid de 2 colunas atual (linhas 218-351) por:

**Linha 1: Cliente/Fornecedor + Valor**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Cliente/Fornecedor */}
  <div className="space-y-2">
    <Label htmlFor="contact">Cliente/Fornecedor</Label>
    <Select value={contactId} onValueChange={handleContactChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um cliente/fornecedor..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__new__">
          <Plus /> Novo cliente/fornecedor
        </SelectItem>
        {/* ... opções */}
      </SelectContent>
    </Select>
  </div>
  
  {/* Valor */}
  <div className="space-y-2">
    <Label htmlFor="amount">Valor (R$) *</Label>
    <Input value={amount} onChange={handleAmountChange} />
  </div>
</div>
```

**Linha 2: Evento Contábil + Conta/Banco**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Evento Contábil */}
  <div className="space-y-2">
    <Label htmlFor="category">Evento Contábil *</Label>
    <Select ... />
  </div>
  
  {/* Conta/Banco */}
  <div className="space-y-2">
    <Label htmlFor="bank">Conta/Banco *</Label>
    <Select ... />
  </div>
</div>
```

**Linha 3: Datas + Anexo (grid de 3 colunas)**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  {/* Data da Transação */}
  <div className="space-y-2">
    <Label htmlFor="date">Data da Transação *</Label>
    <Input type="date" ... />
  </div>
  
  {/* Data de Vencimento */}
  <div className="space-y-2">
    <Label htmlFor="dueDate">Data de Vencimento</Label>
    <Input type="date" ... />
  </div>
  
  {/* Anexo - compacto */}
  <div className="space-y-2">
    <Label>Anexo</Label>
    <AttachmentUpload compact={true} ... />
  </div>
</div>
```

**Linha 4: Observações (100% largura, reduzido)**
```tsx
<div className="space-y-2">
  <Label htmlFor="notes">Observações</Label>
  <Textarea
    rows={1}
    className="min-h-[40px] resize-none"
    placeholder="Notas adicionais..."
  />
</div>
```

**Linha 5: Pago/Recebido** - sem alterações

---

#### Arquivo: `src/components/transactions/AttachmentUpload.tsx`

Adicionar prop `compact` para versão simplificada:

```tsx
interface AttachmentUploadProps {
  // ... props existentes
  compact?: boolean;
}

export function AttachmentUpload({ ..., compact = false }) {
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <input type="file" multiple onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Button type="button" variant="outline" size="sm" className="w-full gap-2">
            <Paperclip className="w-4 h-4" />
            {pendingFiles.length + attachments.length > 0
              ? `${pendingFiles.length + attachments.length} arquivo(s)`
              : 'Anexar'}
          </Button>
        </div>
        {/* Lista compacta de arquivos */}
        {(pendingFiles.length > 0 || attachments.length > 0) && (
          <div className="text-xs text-muted-foreground">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="truncate">{f.name}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => onRemovePendingFile(i)} />
              </div>
            ))}
            {attachments.map(a => (
              <div key={a.id} className="flex items-center gap-1">
                <span className="truncate">{a.file_name}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => onDeleteAttachment(a)} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Versão completa existente
  return ( ... );
}
```

---

### Resumo das Mudanças de Labels

| Campo | Antes | Depois |
|-------|-------|--------|
| Contato | `Contato` | `Cliente/Fornecedor` |
| Placeholder | `Selecione um contato...` | `Selecione um cliente/fornecedor...` |
| Novo contato | `Novo contato` | `Novo cliente/fornecedor` |
| Conta | `Conta` | `Conta/Banco` |

---

### Validação do Formulário (Atualizada)

```tsx
// ANTES:
const isFormValid = description.trim() && parseCurrencyInput(amount) > 0 && categoryId && bankId;

// DEPOIS:
const isFormValid = parseCurrencyInput(amount) > 0 && categoryId && bankId;
```

A descrição não é mais necessária pois será gerada automaticamente a partir do evento contábil selecionado.

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/transactions/TransactionFormDialog.tsx` | Remover campo descrição, reorganizar layout em 5 linhas, renomear labels, atualizar validação |
| `src/components/transactions/AttachmentUpload.tsx` | Adicionar variante `compact` para exibição inline |

**Total**: 2 arquivos
