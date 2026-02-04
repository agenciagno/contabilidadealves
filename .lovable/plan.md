

## Plano: Simplificação da Barra de Filtros e Cards de Resumo

### Objetivo
Remover o filtro por "Regime Tributário" e tornar a área de busca, filtros e cards de resumo mais discretos e minimalistas.

---

### Novo Layout Proposto

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Cliente/Fornecedor                              [+ Novo Cliente/Fornecedor]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🔍 Buscar...          [Status ▼]  [Limpar]     12 total · 10 ✓ · 2 ⚠          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Características do novo design:**
- Barra única e compacta integrando busca, filtro de status e contadores
- Cards de resumo substituídos por indicadores inline discretos
- Filtro de Regime Tributário removido

---

### Alterações Detalhadas

#### Arquivo: `src/pages/Contacts.tsx`

**1. Remover estado e lógica do filtro de Regime Tributário**

| Item | Ação |
|------|------|
| Linha 43 | Remover `const [filterTaxRegime, setFilterTaxRegime] = useState('all');` |
| Linha 95 | Remover `const matchesTaxRegime = filterTaxRegime === 'all' \|\| c.tax_regime === filterTaxRegime;` |
| Linha 103 | Remover `matchesTaxRegime` do return |
| Linha 105 | Remover `filterTaxRegime` da lista de dependências |
| Linha 108 | Remover `filterTaxRegime !== 'all'` da verificação de hasActiveFilters |
| Linha 111 | Remover `setFilterTaxRegime('all');` do clearFilters |
| Linhas 16-22 | Remover constante `taxRegimeLabels` (não utilizada) |

**2. Substituir Cards de Resumo por Indicadores Inline**

Remover os 3 cards separados (linhas 263-298) e substituir por indicadores compactos integrados à barra de filtros:

```tsx
{/* Barra de Filtros Minimalista */}
<div className="flex flex-wrap gap-3 items-center">
  {/* Busca */}
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input 
      placeholder="Buscar por nome ou CNPJ..." 
      value={searchTerm} 
      onChange={e => setSearchTerm(e.target.value)} 
      className="pl-9 h-9 bg-background/50 border-border/50" 
    />
  </div>
  
  {/* Filtro de Status */}
  <Select value={filterFinancialStatus} onValueChange={setFilterFinancialStatus}>
    <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/50">
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="adimplente">Adimplentes</SelectItem>
      <SelectItem value="inadimplente">Inadimplentes</SelectItem>
    </SelectContent>
  </Select>
  
  {/* Limpar Filtros */}
  {hasActiveFilters && (
    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground">
      <X className="h-3.5 w-3.5" />
      Limpar
    </Button>
  )}
  
  {/* Separador */}
  <div className="h-5 w-px bg-border/50 hidden sm:block" />
  
  {/* Indicadores de Resumo Inline */}
  <div className="flex items-center gap-3 text-sm text-muted-foreground">
    <span className="flex items-center gap-1.5">
      <Users className="h-3.5 w-3.5" />
      <span className="font-medium text-foreground">{summaryStats.total}</span>
    </span>
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span>{summaryStats.adimplentes}</span>
    </span>
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-destructive" />
      <span>{summaryStats.inadimplentes}</span>
    </span>
  </div>
</div>
```

**3. Remover imports não utilizados**

```tsx
// ANTES (linha 10):
import { ..., Users, CheckCircle, AlertTriangle, ... } from 'lucide-react';

// DEPOIS:
// Manter apenas Users (usado no indicador inline)
// CheckCircle e AlertTriangle podem ser removidos se não usados em outro lugar
```

Verificando uso:
- `CheckCircle` - usado apenas nos cards removidos → **REMOVER**
- `AlertTriangle` - usado no AlertDialog de exclusão → **MANTER**
- `Users` - usado no indicador inline → **MANTER**

---

### Comparativo Visual

| Elemento | Antes | Depois |
|----------|-------|--------|
| Cards de Resumo | 3 cards separados (ocupam 1 linha inteira) | Indicadores inline na barra de filtros |
| Filtro Regime Tributário | Select com 5 opções | Removido |
| Barra de Filtros | Card com padding grande | Barra compacta e discreta |
| Altura do Input | Padrão | h-9 (menor) |
| Estilo dos Elementos | bg-background | bg-background/50 (mais sutil) |

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Contacts.tsx` | Remover filtro de Regime Tributário, substituir cards por indicadores inline, simplificar barra de filtros |

**Total**: 1 arquivo

**Itens removidos:**
- Estado `filterTaxRegime`
- Constante `taxRegimeLabels`
- Select de Regime Tributário
- 3 Cards de resumo separados
- Import `CheckCircle`

**Itens adicionados:**
- Indicadores de resumo inline (total, adimplentes, inadimplentes)
- Separador visual entre filtros e indicadores

