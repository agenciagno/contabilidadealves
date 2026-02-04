

## Plano: Integração de Consulta Automática de CNPJ (BrasilAPI)

### Objetivo
Automatizar o cadastro de clientes através da consulta de CNPJ na API pública BrasilAPI, preenchendo automaticamente os campos do formulário.

---

### Estrutura da Implementação

```text
┌─────────────────────────────────────────────────────────────┐
│  Campo CPF/CNPJ (com máscara)                               │
│  ┌─────────────────────────────────────────┐ ┌───────────┐  │
│  │  00.000.000/0000-00                     │ │  🔍 Buscar│  │
│  └─────────────────────────────────────────┘ └───────────┘  │
│                                                             │
│  Ao clicar em "Buscar":                                     │
│  1. Valida se é CNPJ (14 dígitos)                          │
│  2. Mostra spinner no botão                                 │
│  3. Bloqueia campos de endereço                            │
│  4. Faz requisição GET para BrasilAPI                      │
│  5. Preenche campos automaticamente                        │
│  6. Libera campos para conferência                         │
└─────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Criar/Modificar

#### 1. Novo Arquivo: `src/lib/cnpj-api.ts`

Função utilitária para consulta à BrasilAPI:

```typescript
export interface CnpjData {
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  ddd_telefone_1: string;
}

export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  // Remove caracteres não numéricos
  const cleanCnpj = cnpj.replace(/\D/g, '');
  
  // Valida tamanho
  if (cleanCnpj.length !== 14) {
    throw new Error('CNPJ deve conter 14 dígitos');
  }
  
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('CNPJ não encontrado na base da Receita Federal');
    }
    throw new Error('Erro ao consultar CNPJ. Tente novamente.');
  }
  
  return response.json();
}
```

---

#### 2. Modificar: `src/components/contacts/ContactFormDialog.tsx`

**Novos imports:**
```typescript
import { Search, Loader2 } from 'lucide-react';
import { fetchCnpjData } from '@/lib/cnpj-api';
import { useToast } from '@/hooks/use-toast';
```

**Novos estados:**
```typescript
const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
const [addressFieldsLocked, setAddressFieldsLocked] = useState(false);
const { toast } = useToast();
```

**Nova função de busca:**
```typescript
const handleFetchCnpj = async () => {
  const cleanDoc = document.replace(/\D/g, '');
  
  // Verificar se é CNPJ (14 dígitos)
  if (cleanDoc.length !== 14) {
    toast({
      title: 'CNPJ inválido',
      description: 'Digite um CNPJ completo (14 dígitos) para buscar',
      variant: 'destructive',
    });
    return;
  }
  
  setIsFetchingCnpj(true);
  setAddressFieldsLocked(true);
  
  try {
    const data = await fetchCnpjData(cleanDoc);
    
    // Auto-preencher campos
    setName(data.nome_fantasia || data.razao_social);
    setAddress(`${data.logradouro}, ${data.numero} - ${data.bairro}`);
    setCity(data.municipio);
    setState(data.uf);
    
    // Telefone: formatar DDD + número
    if (data.ddd_telefone_1) {
      const phoneClean = data.ddd_telefone_1.replace(/\D/g, '');
      setPhone(maskPhone(phoneClean));
    }
    
    toast({
      title: 'Dados carregados!',
      description: 'Confira as informações e complete os campos restantes.',
    });
  } catch (error) {
    toast({
      title: 'Erro na consulta',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsFetchingCnpj(false);
    setAddressFieldsLocked(false);
  }
};
```

**Modificar campo CPF/CNPJ (linha 121-130):**

Antes:
```tsx
<div>
  <Label htmlFor="document">CPF/CNPJ</Label>
  <Input
    id="document"
    value={document}
    onChange={(e) => setDocument(maskCPFCNPJ(e.target.value))}
    placeholder="000.000.000-00"
    maxLength={18}
  />
</div>
```

Depois:
```tsx
<div>
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

**Bloquear campos durante a busca:**

Os campos de endereço (address, city, state) receberão `disabled={addressFieldsLocked}` para evitar edição conflitante durante a consulta.

Exemplo:
```tsx
<Input
  id="address"
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  placeholder="Rua, número, bairro"
  disabled={addressFieldsLocked}
/>
```

---

### Mapeamento de Campos API → Formulário

| Campo do Formulário | Campo da API | Tratamento |
|---------------------|--------------|------------|
| `name` | `nome_fantasia` | Se vazio, usar `razao_social` |
| `address` | `logradouro`, `numero`, `bairro` | Concatenar: `"{logradouro}, {numero} - {bairro}"` |
| `city` | `municipio` | Direto |
| `state` | `uf` | Direto |
| `phone` | `ddd_telefone_1` | Aplicar `maskPhone()` |

---

### Fluxo de UX

```text
┌────────────────────────────────────────────────────────────────┐
│ Usuário digita CNPJ                                            │
│         ↓                                                      │
│ Botão 🔍 fica habilitado (14 dígitos)                         │
│         ↓                                                      │
│ Clique no botão                                                │
│         ↓                                                      │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │  • Botão mostra spinner (loading)                        │   │
│ │  • Campos Nome, Endereço, Cidade, Estado ficam disabled  │   │
│ │  • Requisição GET para BrasilAPI                         │   │
│ └──────────────────────────────────────────────────────────┘   │
│         ↓                                                      │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │  SUCESSO:                                                 │   │
│ │  • Preenche campos automaticamente                       │   │
│ │  • Toast: "Dados carregados!"                            │   │
│ │  • Libera campos para edição/conferência                 │   │
│ │                                                          │   │
│ │  ERRO:                                                   │   │
│ │  • Toast: "CNPJ não encontrado" ou mensagem do erro      │   │
│ │  • Libera campos                                         │   │
│ └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

### Tratamento de Erros

| Cenário | Mensagem |
|---------|----------|
| CNPJ < 14 dígitos | "Digite um CNPJ completo (14 dígitos) para buscar" |
| CNPJ não encontrado (404) | "CNPJ não encontrado na base da Receita Federal" |
| Erro de rede/API | "Erro ao consultar CNPJ. Tente novamente." |

---

### Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `src/lib/cnpj-api.ts` | **CRIAR** - Função `fetchCnpjData()` |
| `src/components/contacts/ContactFormDialog.tsx` | **MODIFICAR** - Adicionar botão de busca, estados de loading, função de auto-preenchimento, bloqueio de campos |

**Total**: 2 arquivos (1 novo, 1 modificado)

