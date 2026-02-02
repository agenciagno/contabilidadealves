

## Plano: Reestruturação do Painel Financeiro

### Objetivo
Reorganizar completamente o Dashboard conforme as especificações: filtros limpos por padrão, nova estrutura de cards em 3 linhas (2 cards de 50% cada), lista unificada de contas a receber/pagar, e remoção de seções desnecessárias.

---

### 1. Alterações no Banco de Dados

**Adicionar coluna `is_caixa_geral` na tabela `banks`**

Para identificar qual banco é o "Caixa Geral", será necessário adicionar um campo booleano:

```sql
ALTER TABLE banks ADD COLUMN is_caixa_geral BOOLEAN DEFAULT FALSE;
```

Isso permitirá que o usuário marque uma conta bancária específica como "Caixa Geral" nas configurações de bancos.

---

### 2. Alterações nos Filtros

**Arquivo:** `src/pages/Dashboard.tsx`

#### A. Alterar período padrão de `'thisMonth'` para `'all'`
```tsx
// Linha 93: De
const [period, setPeriod] = useState<PeriodFilter>('thisMonth');
// Para
const [period, setPeriod] = useState<PeriodFilter>('all');
```

#### B. Atualizar função `handleClearFilters`
```tsx
const handleClearFilters = () => {
  setPeriod('all');  // Alterado de 'thisMonth' para 'all'
  setSearchTerm('');
  setSelectedBankId('all');
  setCategoryFilter('all');
  setContactFilter('all');
  setPaymentStatusFilter('all');
  setCustomStartDate(null);
  setCustomEndDate(null);
};
```

**Arquivo:** `src/components/filters/UnifiedFilterBox.tsx`

#### C. Atualizar lógica de `hasActiveFilters`
```tsx
const hasActiveFilters = 
  period !== 'all' ||   // Alterado de 'thisMonth' para 'all'
  bankId !== 'all' || 
  categoryId !== 'all' || 
  paymentStatus !== 'all' || 
  contactId !== 'all' || 
  searchTerm !== '' ||
  (showTypeFilter && type !== 'all');
```

---

### 3. Nova Estrutura dos Cards Indicativos

**Estrutura Final (3 linhas x 2 colunas de 50%):**

```text
┌─────────────────────────────┬─────────────────────────────┐
│  RECEITAS RECEBIDAS (verde) │  RECEITAS A RECEBER (verde) │
│  (is_paid = true)           │  (is_paid = false)          │
└─────────────────────────────┴─────────────────────────────┘
┌─────────────────────────────┬─────────────────────────────┐
│  CONTAS PAGAS (vermelho)    │  CONTAS A PAGAR (vermelho)  │
│  (despesas is_paid = true)  │  (despesas is_paid = false) │
└─────────────────────────────┴─────────────────────────────┘
┌─────────────────────────────┬─────────────────────────────┐
│  SALDO BANCÁRIO (azul)      │  CAIXA GERAL (azul)         │
│  (soma current_balance)     │  (is_caixa_geral = true)    │
└─────────────────────────────┴─────────────────────────────┘
```

**Código JSX:**
```tsx
{/* Linha 1: Receitas */}
<div className="grid grid-cols-2 gap-4">
  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Receitas Recebidas</span>
        <TrendingUp className="w-5 h-5 text-emerald-500" />
      </div>
      <p className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.receitasPagas)}</p>
    </CardContent>
  </Card>
  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Receitas a Receber</span>
        <PiggyBank className="w-5 h-5 text-emerald-500" />
      </div>
      <p className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.aReceber)}</p>
    </CardContent>
  </Card>
</div>

{/* Linha 2: Despesas */}
<div className="grid grid-cols-2 gap-4">
  <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Contas Pagas</span>
        <TrendingDown className="w-5 h-5 text-red-500" />
      </div>
      <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.despesasPagas)}</p>
    </CardContent>
  </Card>
  <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Contas a Pagar</span>
        <CreditCard className="w-5 h-5 text-red-500" />
      </div>
      <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.aPagar)}</p>
    </CardContent>
  </Card>
</div>

{/* Linha 3: Saldos */}
<div className="grid grid-cols-2 gap-4">
  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Saldo Bancário</span>
        <Wallet className="w-5 h-5 text-blue-500" />
      </div>
      <p className="text-2xl font-bold text-blue-500">{formatCurrency(summary.saldoBancario)}</p>
    </CardContent>
  </Card>
  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Caixa Geral</span>
        <Wallet className="w-5 h-5 text-blue-500" />
      </div>
      <p className="text-2xl font-bold text-blue-500">{formatCurrency(summary.caixaGeral)}</p>
    </CardContent>
  </Card>
</div>
```

---

### 4. Atualizar Cálculos do Summary

**Adicionar cálculos para os novos cards:**
```tsx
const summary = useMemo(() => {
  // Receitas
  const receitasPagas = transactions
    .filter(t => t.type === 'receita' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const aReceber = transactions
    .filter(t => t.type === 'receita' && !t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Despesas
  const despesasPagas = transactions
    .filter(t => t.type === 'despesa' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const aPagar = transactions
    .filter(t => t.type === 'despesa' && !t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Saldos
  const saldoBancario = banks
    .filter(b => b.is_active)
    .reduce((sum, b) => sum + Number(b.current_balance), 0);

  const caixaGeral = banks
    .filter(b => b.is_active && b.is_caixa_geral)
    .reduce((sum, b) => sum + Number(b.current_balance), 0);

  return {
    receitasPagas,
    aReceber,
    despesasPagas,
    aPagar,
    saldoBancario,
    caixaGeral,
  };
}, [transactions, banks]);
```

---

### 5. Lista Unificada de Contas a Receber/Pagar

**Substituir as duas listas separadas por uma única lista unificada:**

```tsx
{/* Lista Unificada - 100% largura */}
<Card className="bg-card border-border/50">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-base flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Contas Pendentes
      </CardTitle>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/movimentacoes" className="text-xs text-muted-foreground">
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {pendingTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className={`flex items-center justify-between p-3 rounded-lg ${
            transaction.type === 'receita' 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              transaction.type === 'receita' ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              {transaction.type === 'receita' ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{transaction.description}</p>
              <p className="text-xs text-muted-foreground">
                {transaction.contact?.name || 'Sem contato'} • Venc: {format(...)}
              </p>
            </div>
          </div>
          <span className={`font-semibold ${
            transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {formatCurrency(Number(transaction.amount))}
          </span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

### 6. Seções a Remover

| Seção | Linhas Aproximadas | Status |
|-------|-------------------|--------|
| Cards de 6 colunas (receitas, despesas, saldo, etc.) | 556-683 | REMOVER |
| Seção "Contas Bancárias" | 685-723 | REMOVER |
| Listas separadas "Contas a Receber" e "Contas a Pagar" | 890-1017 | SUBSTITUIR por lista unificada |
| Cards de rodapé (Transações, Recorrentes, Contatos, Bancos) | 1089-1146 | REMOVER |

---

### 7. Atualizar Configuração de Widgets

**Arquivo:** `src/components/dashboard/DashboardWidgets.tsx`

Atualizar `DEFAULT_WIDGETS` para refletir a nova estrutura:
```tsx
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'receitasRecebidas', name: 'Receitas Recebidas', enabled: true, icon: <TrendingUp /> },
  { id: 'receitasAReceber', name: 'Receitas a Receber', enabled: true, icon: <PiggyBank /> },
  { id: 'contasPagas', name: 'Contas Pagas', enabled: true, icon: <TrendingDown /> },
  { id: 'contasAPagar', name: 'Contas a Pagar', enabled: true, icon: <CreditCard /> },
  { id: 'saldoBancario', name: 'Saldo Bancário', enabled: true, icon: <Wallet /> },
  { id: 'caixaGeral', name: 'Caixa Geral', enabled: true, icon: <Wallet /> },
  { id: 'evolution', name: 'Evolução Mensal', enabled: true, icon: <BarChart3 /> },
  { id: 'revenueCategoryChart', name: 'Receitas por Categoria', enabled: true, icon: <BarChart3 /> },
  { id: 'categoryChart', name: 'Despesas por Categoria', enabled: true, icon: <BarChart3 /> },
  { id: 'pendingList', name: 'Contas Pendentes', enabled: true, icon: <FileText /> },
  { id: 'recentTransactions', name: 'Últimas Movimentações', enabled: true, icon: <TrendingUp /> },
];
```

---

### 8. Atualizar Hook useBanks

**Arquivo:** `src/hooks/useBanks.ts`

Adicionar `is_caixa_geral` à interface `Bank`:
```tsx
export interface Bank {
  id: string;
  company_id: string;
  name: string;
  bank_code: string | null;
  agency: string | null;
  account_number: string | null;
  initial_balance: number;
  current_balance: number;
  color: string;
  is_active: boolean;
  is_caixa_geral: boolean;  // NOVO
  created_at: string;
  updated_at: string;
}
```

---

### 9. Atualizar Formulário de Banco

**Arquivo:** `src/components/banks/BankFormDialog.tsx`

Adicionar checkbox "Marcar como Caixa Geral":
```tsx
<div className="flex items-center space-x-2">
  <Checkbox 
    id="is_caixa_geral" 
    checked={formData.is_caixa_geral} 
    onCheckedChange={(checked) => setFormData({...formData, is_caixa_geral: !!checked})} 
  />
  <Label htmlFor="is_caixa_geral">Marcar como Caixa Geral</Label>
</div>
```

---

### Resumo das Alterações

| Arquivo | Alterações |
|---------|------------|
| **Banco de Dados** | Adicionar coluna `is_caixa_geral` em `banks` |
| `src/pages/Dashboard.tsx` | Período padrão 'all', nova estrutura de cards (3 linhas x 2 colunas), lista unificada, remover seções antigas |
| `src/components/filters/UnifiedFilterBox.tsx` | Atualizar lógica de `hasActiveFilters` para `period !== 'all'` |
| `src/components/dashboard/DashboardWidgets.tsx` | Atualizar widgets disponíveis |
| `src/hooks/useBanks.ts` | Adicionar `is_caixa_geral` à interface |
| `src/components/banks/BankFormDialog.tsx` | Adicionar checkbox "Caixa Geral" |

