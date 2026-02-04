
## Plano: Simplificação do Modal de Cadastro de Contatos

### Objetivo
Reestruturar o layout do formulário de contatos removendo campos desnecessários e reorganizando os campos restantes conforme especificado.

---

### Nova Estrutura do Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  Linha 1: CPF/CNPJ com botão de busca (100% largura)        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Linha 2: Nome do Cliente/Fornecedor (100% largura)         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────┬─────────────────────────────┐
│  Linha 3: E-mail (50%)      │  Telefone (50%)             │
└─────────────────────────────┴─────────────────────────────┘
┌───────────────────┬───────────────────┬───────────────────┐
│  Linha 4:         │                   │                   │
│  Endereço (33%)   │  Cidade (33%)     │  Estado (33%)     │
└───────────────────┴───────────────────┴───────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Linha 5: Observações (100% largura, 1 linha apenas)        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────┬─────────────────────────────┐
│  Cancelar                   │  Salvar                     │
└─────────────────────────────┴─────────────────────────────┘
```

---

### Campos a Remover

| Campo | Motivo |
|-------|--------|
| `Representante Legal` | Solicitado pelo usuário |
| `Regime Tributário` | Solicitado pelo usuário |
| `Contato ativo` (Switch) | Cliente será ativo por padrão (is_active = true sempre) |

---

### Alterações Detalhadas

#### Arquivo: `src/components/contacts/ContactFormDialog.tsx`

**1. Remover estados não utilizados (linhas 45, 52-53):**
```tsx
// REMOVER:
const [taxRegime, setTaxRegime] = useState<TaxRegime | ''>('');
const [isActive, setIsActive] = useState(true);
const [representativeLegal, setRepresentativeLegal] = useState('');
```

**2. Remover imports não utilizados (linhas 7-8):**
```tsx
// REMOVER do import:
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// MANTER apenas para o Select de Estado:
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

**3. Remover constante TAX_REGIMES (linhas 28-34):**
- Não será mais necessária

**4. Atualizar useEffect (linhas 58-84):**
- Remover referências a `taxRegime`, `isActive`, `representativeLegal`

**5. Atualizar handleSubmit (linhas 135-151):**
```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  onSubmit({
    name: name.trim(),
    type: contact?.type || 'cliente',
    document: document.trim() || null,
    tax_regime: null,              // Sempre null
    email: email.trim() || null,
    phone: phone.trim() || null,
    address: address.trim() || null,
    city: city.trim() || null,
    state: state || null,
    notes: notes.trim() || null,
    is_active: true,               // Sempre true por padrão
    representative_legal: null,     // Sempre null
  });
};
```

**6. Reestruturar layout do formulário (linhas 161-304):**

**Linha 1: CPF/CNPJ (100% largura)**
```tsx
<div className="col-span-3">
  <Label htmlFor="document">CPF/CNPJ</Label>
  <div className="flex gap-2">
    <Input
      id="document"
      value={document}
      onChange={(e) => setDocument(maskCPFCNPJ(e.target.value))}
      placeholder="00.000.000/0000-00"
      maxLength={18}
      className="flex-1"
    />
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleFetchCnpj}
      disabled={isFetchingCnpj || document.replace(/\D/g, '').length < 14}
      title="Buscar dados do CNPJ"
    >
      {isFetchingCnpj ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Search className="h-4 w-4" />
      )}
    </Button>
  </div>
</div>
```

**Linha 2: Nome do Cliente/Fornecedor (100% largura)**
```tsx
<div className="col-span-3">
  <Label htmlFor="name">Nome do Cliente/Fornecedor <span className="text-destructive">*</span></Label>
  <Input
    id="name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Nome do cliente ou fornecedor"
    required
  />
</div>
```

**Linha 3: E-mail + Telefone (grid 2 colunas dentro de span-3)**
```tsx
<div className="col-span-3 grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="email">E-mail</Label>
    <Input
      id="email"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="email@exemplo.com"
    />
  </div>
  <div>
    <Label htmlFor="phone">Telefone</Label>
    <Input
      id="phone"
      value={phone}
      onChange={(e) => setPhone(maskPhone(e.target.value))}
      placeholder="(00) 00000-0000"
      maxLength={15}
    />
  </div>
</div>
```

**Linha 4: Endereço + Cidade + Estado (grid 3 colunas)**
```tsx
<div className="col-span-3 grid grid-cols-3 gap-4">
  <div>
    <Label htmlFor="address">Endereço</Label>
    <Input
      id="address"
      value={address}
      onChange={(e) => setAddress(e.target.value)}
      placeholder="Rua, número, bairro"
      disabled={addressFieldsLocked}
    />
  </div>
  <div>
    <Label htmlFor="city">Cidade</Label>
    <Input
      id="city"
      value={city}
      onChange={(e) => setCity(e.target.value)}
      placeholder="Cidade"
      disabled={addressFieldsLocked}
    />
  </div>
  <div>
    <Label htmlFor="state">Estado</Label>
    <Select value={state} onValueChange={setState} disabled={addressFieldsLocked}>
      <SelectTrigger>
        <SelectValue placeholder="UF" />
      </SelectTrigger>
      <SelectContent>
        {STATES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

**Linha 5: Observações (100% largura, 1 linha)**
```tsx
<div className="col-span-3">
  <Label htmlFor="notes">Observações</Label>
  <Textarea
    id="notes"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="Observações adicionais"
    rows={1}
    className="min-h-[40px] resize-none"
  />
</div>
```

**7. Atualizar grid container:**
```tsx
// ANTES:
<div className="grid grid-cols-2 gap-4">

// DEPOIS:
<div className="grid grid-cols-3 gap-4">
```

Usar `grid-cols-3` permite que os campos de 100% usem `col-span-3`, os de 50% fiquem dentro de um sub-grid de 2 colunas, e a linha 4 use naturalmente 3 colunas.

---

### Comparativo Antes/Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Campos no formulário | 10 campos | 7 campos |
| Linhas de layout | 7 linhas | 5 linhas |
| Linha 1 | Nome (100%) | CPF/CNPJ com busca (100%) |
| Linha 2 | CPF/CNPJ + Regime Tributário | Nome do Cliente/Fornecedor (100%) |
| Linha 3 | E-mail + Telefone | E-mail + Telefone (mantido) |
| Linha 4 | Representante + Cidade | Endereço + Cidade + Estado (33% cada) |
| Linha 5 | Endereço + Estado | Observações (1 linha) |
| Linha 6 | Observações (2 linhas) | - |
| Linha 7 | Switch Ativo | - |
| `is_active` | Configurável via Switch | Sempre `true` |

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/contacts/ContactFormDialog.tsx` | Remover campos (Representante, Regime Tributário, Switch Ativo), reorganizar layout em 5 linhas, atualizar labels, reduzir observações para 1 linha |

**Total**: 1 arquivo
