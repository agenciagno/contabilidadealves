
## Plano: Reestruturação do Card de Cliente/Fornecedor

### Objetivo
Atualizar o layout do card de cliente/fornecedor para exibir as informações solicitadas com opção de copiar em todos os campos, e tornar o status financeiro mais discreto.

---

### Novo Layout do Card

```text
┌─────────────────────────────────────────────────────────────┐
│  [👤]  Nome do Cliente (destaque)           [●] Adimplente  │
│                                              (indicador)    │
├─────────────────────────────────────────────────────────────┤
│  📋  00.000.000/0000-00                              [📋]   │
│  📧  email@empresa.com                               [📋]   │
│  📞  (11) 99999-0000                                 [📋]   │
├─────────────────────────────────────────────────────────────┤
│  [Ver Perfil]           [✏️]                    [🗑️]        │
└─────────────────────────────────────────────────────────────┘
```

---

### Alterações Detalhadas

#### Arquivo: `src/pages/Contacts.tsx`

**1. Modificar o componente ContactCard (linhas 173-232)**

**Header do Card - Nome com cópia + indicador discreto:**
```tsx
<div className="flex items-start justify-between mb-3">
  <div className="flex items-center gap-3">
    <div className="p-2 bg-primary/10 rounded-xl">
      <User className="h-5 w-5 text-primary" />
    </div>
    <button 
      onClick={() => copyToClipboard(contact.name, 'Nome')} 
      className="group flex items-center gap-2 hover:text-primary transition-colors text-left"
    >
      <h3 className="font-semibold text-foreground">{contact.name}</h3>
      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
    </button>
  </div>
  {/* Indicador discreto - apenas um círculo colorido com tooltip */}
  <div 
    className={`h-2.5 w-2.5 rounded-full ${isInadimplente ? 'bg-destructive' : 'bg-emerald-500'}`}
    title={isInadimplente ? 'Inadimplente' : 'Adimplente'}
  />
</div>
```

**Informações do Card - Todas com opção de cópia:**
```tsx
<div className="space-y-2 text-sm text-muted-foreground">
  {/* CNPJ/CPF */}
  {contact.document && (
    <button 
      onClick={() => copyToClipboard(contact.document!, 'CPF/CNPJ')} 
      className="group flex items-center gap-2 w-full hover:text-primary transition-colors text-left"
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate flex-1 font-mono text-xs">{contact.document}</span>
      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )}
  
  {/* Telefone */}
  {contact.phone && (
    <button 
      onClick={() => copyToClipboard(contact.phone!, 'Telefone')} 
      className="group flex items-center gap-2 w-full hover:text-primary transition-colors text-left"
    >
      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1">{contact.phone}</span>
      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )}
  
  {/* E-mail */}
  {contact.email && (
    <button 
      onClick={() => copyToClipboard(contact.email!, 'E-mail')} 
      className="group flex items-center gap-2 w-full hover:text-primary transition-colors text-left"
    >
      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate flex-1">{contact.email}</span>
      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )}
</div>
```

---

### Mudanças Visuais

| Elemento | Antes | Depois |
|----------|-------|--------|
| Nome | Texto estático | Clicável para copiar com ícone ao hover |
| CPF/CNPJ | Texto estático (sem ícone) | Clicável com ícone FileText + cópia |
| Telefone | Clicável para copiar | Mantido (já estava funcional) |
| E-mail | Clicável para copiar | Mantido (já estava funcional) |
| Status (Adimplente/Inadimplente) | Badge grande e colorido | Pequeno círculo colorido com tooltip |
| Regime Tributário | Badge abaixo do nome | Removido (não solicitado) |
| Localização (Cidade/Estado) | Exibido | Removido (não solicitado) |

---

### Ordem de Exibição das Informações

1. **Nome** (em destaque, clicável)
2. **CPF/CNPJ** (com ícone de documento)
3. **Telefone** (com ícone de telefone)
4. **E-mail** (com ícone de e-mail)
5. **Status** (indicador discreto no canto superior direito)

---

### Indicador de Status Discreto

O badge atual (`Adimplente`/`Inadimplente`) será substituído por um pequeno círculo colorido:

| Status | Cor | Comportamento |
|--------|-----|---------------|
| Adimplente | Verde (`bg-emerald-500`) | Círculo pequeno |
| Inadimplente | Vermelho (`bg-destructive`) | Círculo pequeno |

O tooltip ao passar o mouse mostrará o texto completo do status.

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Contacts.tsx` | Reestruturar ContactCard: nome clicável, CPF/CNPJ com cópia, status discreto, remover localização e regime tributário |

**Total**: 1 arquivo
