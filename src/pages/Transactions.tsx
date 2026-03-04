import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Plus, Upload, Pencil, Trash2, TrendingUp, TrendingDown, Receipt,
  Download, FileSpreadsheet, FileText, AlertTriangle, Landmark,
  BarChart3, CalendarCheck, ChevronDown, ChevronUp,
  Building2, CheckCircle2, Search, Filter, X, ArrowUpDown
} from 'lucide-react';
import { useTransactions, Transaction, TransactionInsert } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { useTransactionAttachments } from '@/hooks/useTransactionAttachments';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { ImportSpreadsheetDialog } from '@/components/transactions/ImportSpreadsheetDialog';
import { PeriodFilter, getDateRangeFromPeriod } from '@/components/filters/UnifiedFilterBox';
import { exportToCSV, exportToPDF, ReportTransaction } from '@/hooks/useReportData';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO, format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateShort(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yy');
}

type SortField = 'issue_date' | 'due_date' | 'expected_date' | 'date';
type SortOrder = 'asc' | 'desc';

interface ColumnFilters {
  issue_date?: { start: string; end: string };
  due_date?: { start: string; end: string };
  expected_date?: { start: string; end: string };
  date?: { start: string; end: string };
  contact?: string; // stores contact_id (UUID) for exact match
  status?: string;
}

// Column filter popover for date columns
function DateColumnFilter({ value, onChange, sortField, currentSortField, currentSortOrder, onSort }: {
  value?: { start: string; end: string };
  onChange: (v?: { start: string; end: string }) => void;
  sortField: SortField;
  currentSortField: SortField;
  currentSortOrder: SortOrder;
  onSort: (field: SortField, order: SortOrder) => void;
}) {
  const [start, setStart] = useState(value?.start || '');
  const [end, setEnd] = useState(value?.end || '');
  const isActive = currentSortField === sortField;

  const apply = () => {
    if (start || end) onChange({ start, end });
    else onChange(undefined);
  };

  const clear = () => { setStart(''); setEnd(''); onChange(undefined); };

  return (
    <div className="space-y-2 p-2 w-56">
      {/* Sort buttons */}
      <div className="space-y-0.5 pb-2 border-b border-border/40">
        <button
          onClick={() => onSort(sortField, 'asc')}
          className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-1.5 hover:bg-muted ${isActive && currentSortOrder === 'asc' ? 'bg-primary/10 text-primary font-medium' : ''}`}
        >
          <ChevronUp className="w-3 h-3" /> Mais antigo primeiro
        </button>
        <button
          onClick={() => onSort(sortField, 'desc')}
          className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-1.5 hover:bg-muted ${isActive && currentSortOrder === 'desc' ? 'bg-primary/10 text-primary font-medium' : ''}`}
        >
          <ChevronDown className="w-3 h-3" /> Mais recente primeiro
        </button>
      </div>
      {/* Date range filter */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">De</label>
        <Input type="date" value={start} onChange={e => setStart(e.target.value)} max="9999-12-31" className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Até</label>
        <Input type="date" value={end} onChange={e => setEnd(e.target.value)} max="9999-12-31" className="h-8 text-xs" />
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={clear}>Limpar</Button>
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={apply}>Aplicar</Button>
      </div>
    </div>
  );
}

// Column filter popover for text/status columns
function TextColumnFilter({ values, selected, onChange }: { values: string[]; selected?: string; onChange: (v?: string) => void }) {
  return (
    <div className="space-y-1 p-2 w-48 max-h-60 overflow-auto">
      <button onClick={() => onChange(undefined)} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted ${!selected ? 'bg-primary/10 text-primary font-medium' : ''}`}>
        Todos
      </button>
      {values.map(v => (
        <button key={v} onClick={() => onChange(v)} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted truncate ${selected === v ? 'bg-primary/10 text-primary font-medium' : ''}`}>
          {v}
        </button>
      ))}
    </div>
  );
}

function ColumnFilterIcon({ active }: { active: boolean }) {
  return <Filter className={`w-3 h-3 ${active ? 'text-primary' : 'opacity-40'}`} />;
}

export default function Transactions() {
  const [period] = useState<PeriodFilter>('thisYear');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});

  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const {
    transactions: allTransactions, isLoading,
    createTransaction, updateTransaction, deleteTransaction,
    togglePaid, bulkTogglePaid, bulkCreateTransactions
  } = useTransactions();

  const { categories, createCategory } = useCategories();
  const { banks, createBank } = useBanks();
  const { contacts, createContact } = useContacts();
  const { uploadAttachment } = useTransactionAttachments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [defaultType, setDefaultType] = useState<'receita' | 'despesa'>('despesa');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getDateRange = (periodValue: PeriodFilter) => getDateRangeFromPeriod(periodValue);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    const dateRange = getDateRange(period);
    if (dateRange) {
      result = result.filter(t => {
        const dateStr = t.due_date || t.date || t.issue_date;
        if (!dateStr) return true;
        return isWithinInterval(parseISO(dateStr), { start: dateRange.start, end: dateRange.end });
      });
    }

    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);
    if (categoryFilter !== 'all') result = result.filter(t => t.category_id === categoryFilter);
    if (bankFilter !== 'all') result = result.filter(t => t.bank_id === bankFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(s) ||
        (t.contact?.name && t.contact.name.toLowerCase().includes(s)) ||
        (t.notes && t.notes.toLowerCase().includes(s))
      );
    }

    // Column filters
    const cf = columnFilters;
    if (cf.issue_date) {
      result = result.filter(t => {
        if (!t.issue_date) return false;
        if (cf.issue_date!.start && t.issue_date < cf.issue_date!.start) return false;
        if (cf.issue_date!.end && t.issue_date > cf.issue_date!.end) return false;
        return true;
      });
    }
    if (cf.due_date) {
      result = result.filter(t => {
        if (!t.due_date) return false;
        if (cf.due_date!.start && t.due_date < cf.due_date!.start) return false;
        if (cf.due_date!.end && t.due_date > cf.due_date!.end) return false;
        return true;
      });
    }
    if (cf.expected_date) {
      result = result.filter(t => {
        if (!t.expected_date) return false;
        if (cf.expected_date!.start && t.expected_date < cf.expected_date!.start) return false;
        if (cf.expected_date!.end && t.expected_date > cf.expected_date!.end) return false;
        return true;
      });
    }
    if (cf.date) {
      result = result.filter(t => {
        if (!t.date) return false;
        if (cf.date!.start && t.date < cf.date!.start) return false;
        if (cf.date!.end && t.date > cf.date!.end) return false;
        return true;
      });
    }
    if (cf.contact) {
      result = result.filter(t => t.contact_id === cf.contact);
    }
    if (cf.status) {
      const isPaid = cf.status === 'Pago';
      result = result.filter(t => t.is_paid === isPaid);
    }

    result.sort((a, b) => {
      const dateA = a[sortField];
      const dateB = b[sortField];
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return sortOrder === 'asc' ? new Date(dateA).getTime() - new Date(dateB).getTime() : new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return result;
  }, [allTransactions, period, typeFilter, categoryFilter, bankFilter, searchTerm, sortField, sortOrder, columnFilters]);

  // Unique values for text column filters
  // Build unique contacts list from allTransactions (before column filters) to avoid circular dependency
  const uniqueContactOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of allTransactions) {
      if (t.contact_id && t.contact?.name) {
        map.set(t.contact_id, t.contact.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allTransactions]);
  const uniqueStatuses = ['Pago', 'Pendente'];

  // KPI totals — paid uses paid_amount, pending uses amount
  const kpiTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        const amount = t.is_paid && t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount);
        if (t.type === 'receita') { if (t.is_paid) acc.receitasPagas += amount; else acc.receitasPendentes += amount; }
        else { if (t.is_paid) acc.despesasPagas += amount; else acc.despesasPendentes += amount; }
        return acc;
      },
      { receitasPagas: 0, receitasPendentes: 0, despesasPagas: 0, despesasPendentes: 0 }
    );
  }, [filteredTransactions]);

  const bankTotals = useMemo(() => {
    const activeBanks = banks.filter(b => b.is_active);
    const totalBalance = activeBanks.reduce((sum, b) => sum + Number(b.current_balance), 0);
    const caixaGeral = activeBanks.find(b => b.is_caixa_geral);
    return { totalBalance, caixaGeralBalance: caixaGeral ? Number(caixaGeral.current_balance) : null, caixaGeralName: caixaGeral?.name ?? null };
  }, [banks]);

  // BI Ticker
  const biMetrics = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const todayStr = format(today, 'yyyy-MM-dd');
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    let contasEmAtraso = 0, receitasEmAtraso = 0, receitasPendentesMes = 0, despesasPendentesMes = 0;
    let receitasPendentesAteHoje = 0, despesasPendentesAteHoje = 0;
    let receitasMes = 0, despesasMes = 0, receitasPagasMes = 0, despesasPagasMes = 0;

    for (const t of allTransactions) {
      const amt = Number(t.amount); // pending always uses original amount
      const effAmt = t.is_paid && t.paid_amount != null ? Number(t.paid_amount) : amt;
      if (t.type === 'despesa' && !t.is_paid && t.due_date && t.due_date < todayStr) contasEmAtraso += amt;
      if (t.type === 'receita' && !t.is_paid && t.due_date && t.due_date < todayStr) receitasEmAtraso += amt;
      if (!t.is_paid && t.due_date) {
        if (t.due_date >= monthStartStr && t.due_date <= monthEndStr) {
          if (t.type === 'receita') receitasPendentesMes += amt; else despesasPendentesMes += amt;
        }
        if (t.due_date <= todayStr) {
          if (t.type === 'receita') receitasPendentesAteHoje += amt; else despesasPendentesAteHoje += amt;
        }
      }
      if (t.date && t.date >= monthStartStr && t.date <= monthEndStr) {
        if (t.type === 'receita') { receitasMes += effAmt; if (t.is_paid) receitasPagasMes += effAmt; }
        else { despesasMes += effAmt; if (t.is_paid) despesasPagasMes += effAmt; }
      }
    }

    return {
      contasEmAtraso, receitasEmAtraso,
      capitalDeGiroMes: bankTotals.totalBalance + receitasPendentesMes - despesasPendentesMes,
      capitalDeGiroHoje: bankTotals.totalBalance + receitasPendentesAteHoje - despesasPendentesAteHoje,
      lucroPrevisto: receitasMes - despesasMes,
      acumuladoReceitas: receitasPagasMes,
      acumuladoDespesas: despesasPagasMes,
    };
  }, [allTransactions, bankTotals]);

  const handleSubmit = async (data: TransactionInsert, pendingFiles?: File[]) => {
    if (editingTransaction) {
      updateTransaction.mutate({ id: editingTransaction.id, ...data }, {
        onSuccess: async () => {
          if (pendingFiles?.length) for (const file of pendingFiles) await uploadAttachment.mutateAsync({ file, transactionId: editingTransaction.id });
          setDialogOpen(false); setEditingTransaction(null);
        }
      });
    } else {
      createTransaction.mutate(data, {
        onSuccess: async (newTransaction) => {
          if (pendingFiles?.length) for (const file of pendingFiles) await uploadAttachment.mutateAsync({ file, transactionId: newTransaction.id });
          setDialogOpen(false);
        }
      });
    }
  };

  const handleEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setDialogOpen(true); };
  const handleDelete = () => { if (deleteId) deleteTransaction.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); };
  const handleNewTransaction = (type: 'receita' | 'despesa') => { setDefaultType(type); setEditingTransaction(null); setDialogOpen(true); };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const handleSortDirect = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
  };
  const handleBulkPay = () => {
    if (selectedIds.size === 0) return;
    bulkTogglePaid.mutate({ ids: Array.from(selectedIds), is_paid: true }, { onSuccess: () => setSelectedIds(new Set()) });
  };
  const handleBulkDelete = async () => {
    for (const id of selectedIds) await deleteTransaction.mutateAsync(id);
    setSelectedIds(new Set()); setBulkDeleteConfirm(false);
  };

  const totals = { receitas: kpiTotals.receitasPagas + kpiTotals.receitasPendentes, despesas: kpiTotals.despesasPagas + kpiTotals.despesasPendentes };

  const updateColumnFilter = <K extends keyof ColumnFilters>(key: K, value: ColumnFilters[K]) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (value === undefined) delete next[key]; else next[key] = value;
      return next;
    });
  };

  const hasActiveColumnFilters = Object.keys(columnFilters).length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-7 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const exportTransactions = () => filteredTransactions.map(t => ({
    id: t.id, description: t.description, amount: Number(t.amount), type: t.type as 'receita' | 'despesa',
    date: t.date, is_paid: t.is_paid,
    category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color || '#6B7280' } : null,
    bank: t.bank ? { id: t.bank.id, name: t.bank.name, color: t.bank.color || '#3B82F6' } : null,
    contact: t.contact ? { id: t.contact.id, name: t.contact.name, type: t.contact.type } : null,
  })) as ReportTransaction[];

  return (
    <div className="space-y-4">
      {/* ── Header: Title left, Actions right ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Movimentações</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCSV(exportTransactions())} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const dr = getDateRange(period); exportToPDF(exportTransactions(), totals, dr?.start, dr?.end); }} className="gap-2">
                <FileText className="w-4 h-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button size="sm" onClick={() => handleNewTransaction('despesa')} className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="w-4 h-4" /> Nova Movimentação
          </Button>
        </div>
      </div>

      {/* ── Uniform KPI Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* A Receber */}
        <Card className="bg-card border-border/50 border-l-2 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-xs text-muted-foreground">A Receber</p>
            </div>
            <p className="text-base font-bold text-emerald-500">{formatCurrency(kpiTotals.receitasPendentes)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Recebido: {formatCurrency(kpiTotals.receitasPagas)}</p>
          </CardContent>
        </Card>
        {/* A Pagar */}
        <Card className="bg-card border-border/50 border-l-2 border-l-red-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-muted-foreground">A Pagar</p>
            </div>
            <p className="text-base font-bold text-red-500">{formatCurrency(kpiTotals.despesasPendentes)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pago: {formatCurrency(kpiTotals.despesasPagas)}</p>
          </CardContent>
        </Card>
        {/* Saldo Bancário */}
        <Card className="bg-card border-border/50 border-l-2 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">Saldo Bancário</p>
            </div>
            <p className={`text-base font-bold ${bankTotals.totalBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>{formatCurrency(bankTotals.totalBalance)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{bankTotals.caixaGeralName ? `Caixa: ${formatCurrency(bankTotals.caixaGeralBalance ?? 0)}` : 'Total bancos'}</p>
          </CardContent>
        </Card>
        {/* Em Atraso */}
        <Card className="bg-card border-border/50 border-l-2 border-l-red-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-muted-foreground">Em Atraso</p>
            </div>
            <p className="text-sm font-bold text-orange-400">⬇ {formatCurrency(biMetrics.receitasEmAtraso)}</p>
            <p className="text-sm font-bold text-red-500">⬆ {formatCurrency(biMetrics.contasEmAtraso)}</p>
          </CardContent>
        </Card>
        {/* Capital de Giro */}
        <Card className="bg-card border-border/50 border-l-2 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <p className="text-xs text-muted-foreground">Capital de Giro</p>
            </div>
            <p className={`text-base font-bold ${biMetrics.capitalDeGiroMes >= 0 ? 'text-blue-400' : 'text-red-500'}`}>{formatCurrency(biMetrics.capitalDeGiroMes)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Até hoje: {formatCurrency(biMetrics.capitalDeGiroHoje)}</p>
          </CardContent>
        </Card>
        {/* Lucro Previsto */}
        <Card className="bg-card border-border/50 border-l-2 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-xs text-muted-foreground">Lucro Previsto</p>
            </div>
            <p className={`text-base font-bold ${biMetrics.lucroPrevisto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(biMetrics.lucroPrevisto)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(), 'MMMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</p>
          </CardContent>
        </Card>
        {/* Lucro Realizado */}
        <Card className="bg-card border-border/50 border-l-2 border-l-amber-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-muted-foreground">Realizado</p>
            </div>
            <p className={`text-base font-bold ${biMetrics.acumuladoReceitas - biMetrics.acumuladoDespesas >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(biMetrics.acumuladoReceitas - biMetrics.acumuladoDespesas)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(), 'MMMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Minimalist Icon Toolbar ── */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1">
          {/* Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={searchOpen ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchTerm(''); }}>
                <Search className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pesquisar</TooltipContent>
          </Tooltip>
          {searchOpen && (
            <Input
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar..."
              className="h-8 w-48 text-xs"
            />
          )}

          {/* Bank Filter */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant={bankFilter !== 'all' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8">
                    <Landmark className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Conta Bancária</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-auto">
                <button onClick={() => setBankFilter('all')} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted ${bankFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : ''}`}>Todos</button>
                {banks.filter(b => b.is_active).map(b => (
                  <button key={b.id} onClick={() => setBankFilter(b.id)} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 ${bankFilter === b.id ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color || '#10B981' }} />
                    {b.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Category Filter */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant={categoryFilter !== 'all' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8">
                    <Receipt className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Evento Contábil</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-auto">
                <button onClick={() => setCategoryFilter('all')} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted ${categoryFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : ''}`}>Todos</button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategoryFilter(c.id)} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 ${categoryFilter === c.id ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || '#3B82F6' }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Type Filter */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant={typeFilter !== 'all' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8">
                    {typeFilter === 'receita' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : typeFilter === 'despesa' ? <TrendingDown className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4" />}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Tipo</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-36 p-2" align="start">
              <div className="space-y-1">
                <button onClick={() => setTypeFilter('all')} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted ${typeFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : ''}`}>Todos</button>
                <button onClick={() => setTypeFilter('receita')} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 ${typeFilter === 'receita' ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                  <TrendingUp className="w-3 h-3 text-emerald-500" /> Receita
                </button>
                <button onClick={() => setTypeFilter('despesa')} className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 ${typeFilter === 'despesa' ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                  <TrendingDown className="w-3 h-3 text-red-500" /> Despesa
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear column filters */}
          {hasActiveColumnFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={() => setColumnFilters({})}>
              <X className="w-3 h-3" /> Limpar filtros de coluna
            </Button>
          )}

          {/* Bulk actions + count */}
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button size="sm" className="h-7 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={handleBulkPay}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pagar {selectedIds.size}
                </Button>
                <Button size="sm" variant="destructive" className="h-7 gap-1.5 text-xs" onClick={() => setBulkDeleteConfirm(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Excluir {selectedIds.size}
                </Button>
              </>
            )}
            <span className="text-muted-foreground text-xs">{filteredTransactions.length} transação(ões)</span>
          </div>
        </div>
      </TooltipProvider>

      {/* ── Transaction Table ── */}
      {filteredTransactions.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="text-muted-foreground text-center py-16">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Ajuste os filtros ou clique em "Nova Movimentação"</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border/50 overflow-hidden">
          <CardContent className="p-0 max-h-[70vh] overflow-auto">
            {/* Table Header with Excel-style filters */}
            <div className="grid grid-cols-[40px_100px_1fr_110px_110px_110px_90px_110px_110px_90px] gap-3 px-4 py-2 bg-card border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
              <div className="flex items-center justify-center">
                <Checkbox checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0} onCheckedChange={toggleSelectAll} />
              </div>

              {/* Emissão */}
              <div className="flex items-center gap-0.5">
                <span>Emissão</span>
                <Popover>
                  <PopoverTrigger asChild><button><ColumnFilterIcon active={!!columnFilters.issue_date || sortField === 'issue_date'} /></button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><DateColumnFilter value={columnFilters.issue_date} onChange={v => updateColumnFilter('issue_date', v)} sortField="issue_date" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortDirect} /></PopoverContent>
                </Popover>
              </div>

              {/* Cliente / Evento */}
              <div className="flex items-center gap-0.5">
                <span>Cliente / Evento</span>
                <Popover>
                  <PopoverTrigger asChild><button><ColumnFilterIcon active={!!columnFilters.contact} /></button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><TextColumnFilter values={uniqueContacts} selected={columnFilters.contact} onChange={v => updateColumnFilter('contact', v)} /></PopoverContent>
                </Popover>
              </div>

              {/* Vencimento */}
              <div className="flex items-center justify-center gap-0.5">
                <span>Vencimento</span>
                <Popover>
                  <PopoverTrigger asChild><button><ColumnFilterIcon active={!!columnFilters.due_date || sortField === 'due_date'} /></button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><DateColumnFilter value={columnFilters.due_date} onChange={v => updateColumnFilter('due_date', v)} sortField="due_date" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortDirect} /></PopoverContent>
                </Popover>
              </div>

              {/* Prevista */}
              <div className="flex items-center justify-center gap-0.5">
                <span>Prevista</span>
                <Popover>
                  <PopoverTrigger asChild><button><ColumnFilterIcon active={!!columnFilters.expected_date || sortField === 'expected_date'} /></button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><DateColumnFilter value={columnFilters.expected_date} onChange={v => updateColumnFilter('expected_date', v)} sortField="expected_date" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortDirect} /></PopoverContent>
                </Popover>
              </div>

              {/* Pagamento */}
              <div className="flex items-center justify-center gap-0.5">
                <span>Pagamento</span>
                <Popover>
                  <PopoverTrigger asChild><button><ColumnFilterIcon active={!!columnFilters.date || sortField === 'date'} /></button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><DateColumnFilter value={columnFilters.date} onChange={v => updateColumnFilter('date', v)} sortField="date" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortDirect} /></PopoverContent>
                </Popover>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-0.5">
                <span>Status</span>
                <Popover>
                  <PopoverTrigger asChild><button><ColumnFilterIcon active={!!columnFilters.status} /></button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><TextColumnFilter values={uniqueStatuses} selected={columnFilters.status} onChange={v => updateColumnFilter('status', v)} /></PopoverContent>
                </Popover>
              </div>

              <div className="text-right">Valor</div>
              <div className="text-right">Recebido</div>
              <div className="text-center">Ações</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/30">
              {filteredTransactions.map(transaction => {
                const isOverdue = !transaction.is_paid && transaction.due_date && transaction.due_date < new Date().toISOString().split('T')[0];
                return (
                  <div key={transaction.id} className={`grid grid-cols-[40px_100px_1fr_110px_110px_110px_90px_110px_110px_90px] gap-3 px-4 py-3 hover:bg-muted/30 transition-colors items-center ${selectedIds.has(transaction.id) ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}>
                    <div className="flex items-center justify-center">
                      <Checkbox checked={selectedIds.has(transaction.id)} onCheckedChange={() => toggleSelect(transaction.id)} />
                    </div>
                    <div className="text-xs font-mono tabular-nums text-muted-foreground">{formatDateShort(transaction.issue_date)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{transaction.contact?.name ?? transaction.description}</span>
                        {isOverdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/40 whitespace-nowrap shrink-0">Vencido</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        {transaction.category && <span style={{ color: transaction.category.color }}>{transaction.category.name}</span>}
                        {transaction.category && transaction.bank && <span className="text-muted-foreground/40">•</span>}
                        {transaction.bank && <span>{transaction.bank.name}</span>}
                        <span className="text-muted-foreground/40">•</span>
                        <span className={transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'}>
                          {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center text-xs font-mono tabular-nums text-muted-foreground">{formatDateShort(transaction.due_date)}</div>
                    <div className="text-center text-xs font-mono tabular-nums text-muted-foreground">{formatDateShort(transaction.expected_date)}</div>
                    <div className="text-center text-xs font-mono tabular-nums text-muted-foreground">{formatDateShort(transaction.date)}</div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => togglePaid.mutate({ id: transaction.id, is_paid: !transaction.is_paid })}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                          transaction.is_paid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-amber-500 text-amber-500 bg-transparent hover:bg-amber-500/10'
                        }`}>
                        {transaction.is_paid ? 'Pago' : 'Pendente'}
                      </button>
                    </div>
                    <div className={`text-right font-bold text-sm tabular-nums ${transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                    </div>
                    <div className={`text-right text-sm tabular-nums ${transaction.is_paid && transaction.paid_amount != null ? (transaction.type === 'receita' ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold') : 'text-muted-foreground'}`}>
                      {transaction.is_paid && transaction.paid_amount != null
                        ? `${transaction.type === 'receita' ? '+' : '-'}${formatCurrency(Number(transaction.paid_amount))}`
                        : '—'}
                    </div>
                    <div className="flex gap-0.5 justify-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => handleEdit(transaction)}><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteId(transaction.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTransaction}
        categories={categories}
        banks={banks}
        contacts={contacts}
        onSubmit={handleSubmit}
        isLoading={createTransaction.isPending || updateTransaction.isPending}
        defaultType={defaultType}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} transação(ões)?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir {selectedIds.size}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportSpreadsheetDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        banks={banks}
        categories={categories}
        contacts={contacts}
        onImport={async (txns) => { await bulkCreateTransactions.mutateAsync(txns); }}
        onCreateCategory={async (name) => { const data = await createCategory.mutateAsync({ name, type: 'receita', color: '#3B82F6', icon: 'tag' }); return { id: data.id }; }}
        onCreateContact={async (name) => { const data = await createContact.mutateAsync({ name, type: 'cliente', is_active: true, boleto_active: false, document: null, email: null, phone: null, cep: null, address: null, address_number: null, neighborhood: null, city: null, state: null, notes: null, tax_regime: null, representative_legal: null, boleto_value: null, boleto_due_day: null, boleto_start_date: null, origin: 'imported' }); return { id: data.id }; }}
        onCreateBank={async (name) => { const data = await createBank.mutateAsync({ name, initial_balance: 0, color: '#10B981', is_active: true, is_caixa_geral: false, bank_code: null, agency: null, account_number: null }); return { id: data.id }; }}
      />
    </div>
  );
}
