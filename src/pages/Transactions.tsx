import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Check,
  Receipt,
  LayoutGrid,
  List,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  addDays,
  addMonths,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
} from 'date-fns';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
    togglePaid,
  } = useTransactions();

  const { categories } = useCategories();
  const { banks } = useBanks();
  const { contacts } = useContacts();
  const { uploadAttachment } = useTransactionAttachments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<'receita' | 'despesa'>('despesa');

  // Calculate date range based on period
  const getDateRange = (periodValue: PeriodFilter): { start: Date; end: Date } | null => {
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

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category_id === categoryFilter);
    }

    // Bank filter
    if (bankFilter !== 'all') {
      result = result.filter((t) => t.bank_id === bankFilter);
    }

    // Contact filter
    if (contactFilter !== 'all') {
      result = result.filter((t) => t.contact_id === contactFilter);
    }

    // Payment status filter
    if (paymentStatusFilter === 'paid') {
      result = result.filter((t) => t.is_paid);
    } else if (paymentStatusFilter === 'pending') {
      result = result.filter((t) => !t.is_paid);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(search));
    }

    // Sort
    result.sort((a, b) => {
      const comparison = a.date.localeCompare(b.date);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allTransactions, period, typeFilter, categoryFilter, bankFilter, contactFilter, paymentStatusFilter, searchTerm, sortField, sortOrder, customStartDate, customEndDate]);

  // Calculate totals from filtered transactions
  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        const amount = Number(t.amount);
        if (t.type === 'receita') {
          acc.receitas += amount;
        } else {
          acc.despesas += amount;
        }
        return acc;
      },
      { receitas: 0, despesas: 0 }
    );
  }, [filteredTransactions]);

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
          },
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
        },
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

  const saldo = totals.receitas - totals.despesas;

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Movimentações</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          {/* Export Dropdown */}
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
                  const reportTransactions: ReportTransaction[] = filteredTransactions.map(t => ({
                    id: t.id,
                    description: t.description,
                    amount: Number(t.amount),
                    type: t.type as 'receita' | 'despesa',
                    date: t.date,
                    is_paid: t.is_paid,
                    category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color || '#6B7280' } : null,
                    bank: t.bank ? { id: t.bank.id, name: t.bank.name, color: t.bank.color || '#3B82F6' } : null,
                    contact: t.contact ? { id: t.contact.id, name: t.contact.name, type: t.contact.type } : null,
                  }));
                  exportToCSV(reportTransactions);
                }}
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  const reportTransactions: ReportTransaction[] = filteredTransactions.map(t => ({
                    id: t.id,
                    description: t.description,
                    amount: Number(t.amount),
                    type: t.type as 'receita' | 'despesa',
                    date: t.date,
                    is_paid: t.is_paid,
                    category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color || '#6B7280' } : null,
                    bank: t.bank ? { id: t.bank.id, name: t.bank.name, color: t.bank.color || '#3B82F6' } : null,
                    contact: t.contact ? { id: t.contact.id, name: t.contact.name, type: t.contact.type } : null,
                  }));
                  const dateRange = getDateRange(period);
                  exportToPDF(reportTransactions, totals, dateRange?.start, dateRange?.end);
                }}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* New Transaction Button - Highlighted */}
          <Button
            onClick={() => handleNewTransaction('despesa')}
            className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nova Movimentação
          </Button>
        </div>
      </div>

      {/* Filters */}
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
        showTypeFilter={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totals.receitas)}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredTransactions.filter(t => t.type === 'receita').length} transação(ões)
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(totals.despesas)}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredTransactions.filter(t => t.type === 'despesa').length} transação(ões)
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo do Período</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {saldo < 0 ? '-' : ''}{formatCurrency(Math.abs(saldo))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {saldo >= 0 ? 'Positivo' : 'Negativo'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${saldo >= 0 ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                <Receipt className={`w-6 h-6 ${saldo >= 0 ? 'text-primary' : 'text-red-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Ordenar por:</span>
        <Button
          variant={sortField === 'date' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleSort('date')}
          className="gap-1"
        >
          Data
          {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
      </div>

      {/* Transactions List/Grid */}
      {filteredTransactions.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="text-muted-foreground text-center py-16">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Ajuste os filtros ou clique em "Nova Movimentação" para começar</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      transaction.type === 'receita' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    {transaction.type === 'receita' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{transaction.description}</span>
                      <span
                        className={`font-bold whitespace-nowrap ${
                          transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {transaction.type === 'receita' ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
                      </span>
                    </div>
                    {/* Metadata line */}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                      {transaction.category && (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: transaction.category.color }}
                          />
                          {transaction.category.name}
                        </span>
                      )}
                      {transaction.bank && (
                        <>
                          {transaction.category && <span className="text-muted-foreground/50">|</span>}
                          <span>{transaction.bank.name}</span>
                        </>
                      )}
                      {transaction.contact && (
                        <>
                          {(transaction.category || transaction.bank) && <span className="text-muted-foreground/50">|</span>}
                          <span className="text-primary">{transaction.contact.name}</span>
                        </>
                      )}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      📅 {formatDate(transaction.date)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(transaction.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border/50">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={transaction.is_paid}
                    onCheckedChange={(checked) =>
                      togglePaid.mutate({ id: transaction.id, is_paid: !!checked })
                    }
                  />

                  {/* Type Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'receita' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    {transaction.type === 'receita' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${transaction.is_paid ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {transaction.description}
                      </span>
                      {transaction.is_paid && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Check className="w-3 h-3" />
                          {transaction.type === 'receita' ? 'Recebido' : 'Pago'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(transaction.date)}</span>
                      {transaction.category && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: transaction.category.color }}
                            />
                            <span>{transaction.category.name}</span>
                          </div>
                        </>
                      )}
                      {transaction.bank && (
                        <>
                          <span>•</span>
                          <span>{transaction.bank.name}</span>
                        </>
                      )}
                      {transaction.contact && (
                        <>
                          <span>•</span>
                          <span className="text-primary">{transaction.contact.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <span
                    className={`font-bold text-lg ${
                      transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {transaction.type === 'receita' ? '+' : '-'}
                    {formatCurrency(Number(transaction.amount))}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(transaction.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
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
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
