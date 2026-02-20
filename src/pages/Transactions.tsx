import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Receipt,
  LayoutGrid,
  List,
  Download,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  AlertTriangle,
  Landmark,
  BarChart3,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Building2 } from
'lucide-react';
import { useTransactions, Transaction, TransactionInsert } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { useTransactionAttachments } from '@/hooks/useTransactionAttachments';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { UnifiedFilterBox, PeriodFilter, getDateRangeFromPeriod } from '@/components/filters/UnifiedFilterBox';
import { exportToCSV, exportToPDF, ReportTransaction } from '@/hooks/useReportData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isBefore,
  isToday,
  format } from
'date-fns';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDateShort(dateStr: string) {
  return format(new Date(dateStr + 'T12:00:00'), 'dd/MM');
}

type SortField = 'date';
type SortOrder = 'asc' | 'desc';

export default function Transactions() {
  // Filter states
  const [period, setPeriod] = useState<PeriodFilter>('thisMonth');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sort states
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // View states
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const {
    transactions: allTransactions,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    togglePaid
  } = useTransactions();

  const { categories } = useCategories();
  const { banks } = useBanks();
  const { contacts } = useContacts();
  const { uploadAttachment } = useTransactionAttachments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<'receita' | 'despesa'>('despesa');

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (bankFilter !== 'all') count++;
    if (contactFilter !== 'all') count++;
    if (paymentStatusFilter !== 'all') count++;
    if (searchTerm) count++;
    if (period !== 'thisMonth') count++;
    return count;
  }, [typeFilter, categoryFilter, bankFilter, contactFilter, paymentStatusFilter, searchTerm, period]);

  // Calculate date range based on period
  const getDateRange = (periodValue: PeriodFilter): {start: Date;end: Date;} | null => {
    if (periodValue === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    return getDateRangeFromPeriod(periodValue);
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    // Period filter
    const dateRange = getDateRange(period);
    if (dateRange) {
      result = result.filter((t) => {
        const transactionDate = parseISO(t.date);
        return isWithinInterval(transactionDate, { start: dateRange.start, end: dateRange.end });
      });
    }

    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter);
    if (categoryFilter !== 'all') result = result.filter((t) => t.category_id === categoryFilter);
    if (bankFilter !== 'all') result = result.filter((t) => t.bank_id === bankFilter);
    if (contactFilter !== 'all') result = result.filter((t) => t.contact_id === contactFilter);
    if (paymentStatusFilter === 'paid') result = result.filter((t) => t.is_paid);else
    if (paymentStatusFilter === 'pending') result = result.filter((t) => !t.is_paid);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(s));
    }

    result.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allTransactions, period, typeFilter, categoryFilter, bankFilter, contactFilter, paymentStatusFilter, searchTerm, sortField, sortOrder, customStartDate, customEndDate]);

  // KPI totals from filteredTransactions (respects UI filters)
  const kpiTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        const amount = Number(t.amount);
        if (t.type === 'receita') {
          if (t.is_paid) acc.receitasPagas += amount;else
          acc.receitasPendentes += amount;
        } else {
          if (t.is_paid) acc.despesasPagas += amount;else
          acc.despesasPendentes += amount;
        }
        return acc;
      },
      { receitasPagas: 0, receitasPendentes: 0, despesasPagas: 0, despesasPendentes: 0 }
    );
  }, [filteredTransactions]);

  // Global bank totals (ignores UI filters)
  const bankTotals = useMemo(() => {
    const activeBanks = banks.filter((b) => b.is_active);
    const totalBalance = activeBanks.reduce((sum, b) => sum + Number(b.current_balance), 0);
    const caixaGeral = activeBanks.find((b) => b.is_caixa_geral);
    return {
      totalBalance,
      caixaGeralBalance: caixaGeral ? Number(caixaGeral.current_balance) : null,
      caixaGeralName: caixaGeral?.name ?? null
    };
  }, [banks]);

  // BI Ticker metrics (global — ignores UI filters, uses allTransactions + current month)
  const biMetrics = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const todayStr = format(today, 'yyyy-MM-dd');
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    let contasEmAtraso = 0;
    let receitasEmAtraso = 0;
    let receitasHoje = 0;
    let despesasHoje = 0;
    let receitasMes = 0;
    let despesasMes = 0;
    let receitasPagasMes = 0;
    let despesasPagasMes = 0;

    for (const t of allTransactions) {
      const amount = Number(t.amount);
      // Contas em atraso: despesas não pagas com due_date antes de hoje
      if (t.type === 'despesa' && !t.is_paid && t.due_date && t.due_date < todayStr) {
        contasEmAtraso += amount;
      }
      // Receitas em atraso: receitas não recebidas com due_date antes de hoje
      if (t.type === 'receita' && !t.is_paid && t.due_date && t.due_date < todayStr) {
        receitasEmAtraso += amount;
      }
      // Capital de giro: receitas/despesas com due_date hoje
      if (t.due_date === todayStr) {
        if (t.type === 'receita') receitasHoje += amount;else
        despesasHoje += amount;
      }
      // Mês corrente
      if (t.date >= monthStartStr && t.date <= monthEndStr) {
        if (t.type === 'receita') {
          receitasMes += amount;
          if (t.is_paid) receitasPagasMes += amount;
        } else {
          despesasMes += amount;
          if (t.is_paid) despesasPagasMes += amount;
        }
      }
    }

    const capitalDeGiro = bankTotals.totalBalance + receitasHoje - despesasHoje;
    const lucroPrevisto = receitasMes - despesasMes;
    const acumuladoReceitas = receitasPagasMes;
    const acumuladoDespesas = despesasPagasMes;

    return { contasEmAtraso, receitasEmAtraso, capitalDeGiro, lucroPrevisto, acumuladoReceitas, acumuladoDespesas };
  }, [allTransactions, bankTotals]);

  const handleClearFilters = () => {
    setPeriod('thisMonth');
    setTypeFilter('all');
    setCategoryFilter('all');
    setBankFilter('all');
    setContactFilter('all');
    setPaymentStatusFilter('all');
    setSearchTerm('');
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  const handleSubmit = async (data: TransactionInsert, pendingFiles?: File[]) => {
    if (editingTransaction) {
      updateTransaction.mutate(
        { id: editingTransaction.id, ...data },
        {
          onSuccess: async () => {
            if (pendingFiles && pendingFiles.length > 0) {
              for (const file of pendingFiles) {
                await uploadAttachment.mutateAsync({ file, transactionId: editingTransaction.id });
              }
            }
            setDialogOpen(false);
            setEditingTransaction(null);
          }
        }
      );
    } else {
      createTransaction.mutate(data, {
        onSuccess: async (newTransaction) => {
          if (pendingFiles && pendingFiles.length > 0) {
            for (const file of pendingFiles) {
              await uploadAttachment.mutateAsync({ file, transactionId: newTransaction.id });
            }
          }
          setDialogOpen(false);
        }
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTransaction.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const handleNewTransaction = (type: 'receita' | 'despesa') => {
    setDefaultType(type);
    setEditingTransaction(null);
    setDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // For export
  const totals = { receitas: kpiTotals.receitasPagas + kpiTotals.receitasPendentes, despesas: kpiTotals.despesasPagas + kpiTotals.despesasPendentes };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>);

  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Movimentações</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
      </div>

          <div className="space-y-5">
            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2">
              <div className="flex border border-border rounded-lg overflow-hidden">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="rounded-none">
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="rounded-none">
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="outline" className="gap-2 relative" onClick={() => setFiltersOpen((v) => !v)}>
                <SlidersHorizontal className="w-4 h-4" />
                Filtros Avançados
                {activeFilterCount > 0 &&
            <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
            }
                {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                onClick={() => {
                  const rt: ReportTransaction[] = filteredTransactions.map((t) => ({
                    id: t.id, description: t.description, amount: Number(t.amount), type: t.type as 'receita' | 'despesa',
                    date: t.date, is_paid: t.is_paid,
                    category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color || '#6B7280' } : null,
                    bank: t.bank ? { id: t.bank.id, name: t.bank.name, color: t.bank.color || '#3B82F6' } : null,
                    contact: t.contact ? { id: t.contact.id, name: t.contact.name, type: t.contact.type } : null
                  }));
                  exportToCSV(rt);
                }}
                className="gap-2">

                    <FileSpreadsheet className="w-4 h-4" /> Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                onClick={() => {
                  const rt: ReportTransaction[] = filteredTransactions.map((t) => ({
                    id: t.id, description: t.description, amount: Number(t.amount), type: t.type as 'receita' | 'despesa',
                    date: t.date, is_paid: t.is_paid,
                    category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color || '#6B7280' } : null,
                    bank: t.bank ? { id: t.bank.id, name: t.bank.name, color: t.bank.color || '#3B82F6' } : null,
                    contact: t.contact ? { id: t.contact.id, name: t.contact.name, type: t.contact.type } : null
                  }));
                  const dateRange = getDateRange(period);
                  exportToPDF(rt, totals, dateRange?.start, dateRange?.end);
                }}
                className="gap-2">

                    <FileText className="w-4 h-4" /> Exportar PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => handleNewTransaction('despesa')} className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">
                <Plus className="w-4 h-4" />
                Nova Movimentação
              </Button>
            </div>

            {/* Collapsible Filters */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleContent>
                <UnifiedFilterBox
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              period={period}
              onPeriodChange={setPeriod}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomStartDateChange={setCustomStartDate}
              onCustomEndDateChange={setCustomEndDate}
              bankId={bankFilter}
              onBankChange={setBankFilter}
              banks={banks}
              categoryId={categoryFilter}
              onCategoryChange={setCategoryFilter}
              categories={categories}
              paymentStatus={paymentStatusFilter}
              onPaymentStatusChange={setPaymentStatusFilter}
              contactId={contactFilter}
              onContactChange={setContactFilter}
              contacts={contacts}
              onClearFilters={handleClearFilters}
              type={typeFilter}
              onTypeChange={setTypeFilter}
              showTypeFilter={true} />

              </CollapsibleContent>
            </Collapsible>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">A Receber</p>
                      <p className="text-4xl font-extrabold tracking-tight text-emerald-500">{formatCurrency(kpiTotals.receitasPendentes)}</p>
                      <p className="text-xs text-muted-foreground">
                        Recebido: <span className="text-emerald-400">{formatCurrency(kpiTotals.receitasPagas)}</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">A Pagar</p>
                      <p className="text-4xl font-extrabold tracking-tight text-red-500">{formatCurrency(kpiTotals.despesasPendentes)}</p>
                      <p className="text-xs text-muted-foreground">
                        Pago: <span className="text-red-400">{formatCurrency(kpiTotals.despesasPagas)}</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SALDO BANCÁRIO</p>
                      <p className={`text-4xl font-extrabold tracking-tight ${bankTotals.totalBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                        {formatCurrency(bankTotals.totalBalance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bankTotals.caixaGeralName ?
                    <>Caixa Geral: <span className="text-primary">{formatCurrency(bankTotals.caixaGeralBalance ?? 0)}</span></> :
                    'Total em todos os bancos'
                    }
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* BI Ticker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-card border-border/50 border-l-2 border-l-red-500">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Em Atraso</p>
                  </div>
                  <p className="text-sm font-bold text-orange-400">⬇ Receber: {formatCurrency(biMetrics.receitasEmAtraso)}</p>
                  <p className="text-sm font-bold text-red-500">⬆ Pagar: {formatCurrency(biMetrics.contasEmAtraso)}</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 border-l-2 border-l-blue-500">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Capital de Giro</p>
                  </div>
                  <p className={`text-base font-bold ${biMetrics.capitalDeGiro >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                    {formatCurrency(biMetrics.capitalDeGiro)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Bancos ± vencimentos hoje</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 border-l-2 border-l-emerald-500">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Lucro Previsto</p>
                  </div>
                  <p className={`text-base font-bold ${biMetrics.lucroPrevisto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(biMetrics.lucroPrevisto)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Receitas − Despesas (mês)</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 border-l-2 border-l-amber-500">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Resultado Realizado</p>
                  </div>
                  <p className={`text-base font-bold ${biMetrics.acumuladoReceitas - biMetrics.acumuladoDespesas >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(biMetrics.acumuladoReceitas - biMetrics.acumuladoDespesas)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Realizado no mês corrente</p>
                </CardContent>
              </Card>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ordenar por:</span>
              <Button variant={sortField === 'date' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleSort('date')} className="gap-1">
                Data {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <span className="text-muted-foreground text-xs ml-auto">{filteredTransactions.length} transação(ões)</span>
            </div>

            {/* Transactions List/Grid */}
            {filteredTransactions.length === 0 ?
        <Card className="bg-card border-border/50">
                <CardContent className="text-muted-foreground text-center py-16">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma transação encontrada</p>
                  <p className="text-sm mt-1">Ajuste os filtros ou clique em "Nova Movimentação" para começar</p>
                </CardContent>
              </Card> :
        viewMode === 'grid' ?
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTransactions.map((transaction) =>
          <Card key={transaction.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${transaction.type === 'receita' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                          {transaction.type === 'receita' ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{transaction.description}</span>
                            <span className={`font-bold whitespace-nowrap ${transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {transaction.type === 'receita' ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                            {transaction.category &&
                    <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: transaction.category.color }} />
                                {transaction.category.name}
                              </span>
                    }
                            {transaction.bank && <>{transaction.category && <span className="text-muted-foreground/50">|</span>}<span>{transaction.bank.name}</span></>}
                            {transaction.contact && <>{(transaction.category || transaction.bank) && <span className="text-muted-foreground/50">|</span>}<span className="text-primary">{transaction.contact.name}</span></>}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">📅 {formatDateShort(transaction.date)}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(transaction.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
          )}
              </div> :

        <Card className="bg-card border-border/50">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {filteredTransactions.map((transaction) =>
              <div key={transaction.id} className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors group">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${transaction.type === 'receita' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                          {transaction.type === 'receita' ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold text-muted-foreground shrink-0 tabular-nums bg-muted/60 px-1.5 py-0.5 rounded">{formatDateShort(transaction.date)}</span>
                            <span className="text-muted-foreground/50 text-sm">•</span>
                            <span className="truncate text-base font-semibold text-foreground">{transaction.contact?.name ?? transaction.description}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {transaction.category &&
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 rounded font-medium" style={{ backgroundColor: `${transaction.category.color}22`, color: transaction.category.color, borderColor: `${transaction.category.color}44` }}>
                                {transaction.category.name}
                              </Badge>
                    }
                            {transaction.bank && <>{transaction.category && <span className="text-muted-foreground/40 text-sm">•</span>}<span className="text-sm text-muted-foreground font-medium">{transaction.bank.name}</span></>}
                            <span className="text-muted-foreground/40 text-sm">•</span>
                            <span className={`text-sm font-medium ${transaction.type === 'receita' ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                              {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                            </span>
                            {!transaction.is_paid && transaction.due_date && transaction.due_date < new Date().toISOString().split('T')[0] &&
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/40 whitespace-nowrap">Vencido</span>
                    }
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                    onClick={() => togglePaid.mutate({ id: transaction.id, is_paid: !transaction.is_paid })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                    transaction.is_paid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-amber-500 text-amber-500 bg-transparent hover:bg-amber-500/10'}`
                    }>

                            {transaction.is_paid ? transaction.type === 'receita' ? 'Recebido' : 'Pago' : 'Pendente'}
                          </button>
                          <span className={`font-extrabold text-xl tabular-nums tracking-tight ${transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted" onClick={() => handleEdit(transaction)}><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10" onClick={() => setDeleteId(transaction.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
              )}
                  </div>
                </CardContent>
              </Card>
        }
          </div>

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTransaction}
        categories={categories}
        banks={banks}
        contacts={contacts}
        onSubmit={handleSubmit}
        isLoading={createTransaction.isPending || updateTransaction.isPending}
        defaultType={defaultType} />


      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}