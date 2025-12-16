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
  Hash,
} from 'lucide-react';
import { useTransactions, Transaction, TransactionInsert } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { useTransactionAttachments } from '@/hooks/useTransactionAttachments';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { TransactionFilters, PeriodFilter } from '@/components/transactions/TransactionFilters';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
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

type SortField = 'date' | 'amount' | 'description';
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
  const getDateRange = (period: PeriodFilter): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (period) {
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last30Days':
        return { start: subDays(now, 30), end: now };
      case 'last15Days':
        return { start: subDays(now, 15), end: now };
      case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return null;
    }
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
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'amount':
          comparison = Number(a.amount) - Number(b.amount);
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allTransactions, period, typeFilter, categoryFilter, bankFilter, contactFilter, paymentStatusFilter, searchTerm, sortField, sortOrder]);

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
      <TransactionFilters
        period={period}
        onPeriodChange={setPeriod}
        type={typeFilter}
        onTypeChange={setTypeFilter}
        categoryId={categoryFilter}
        onCategoryChange={setCategoryFilter}
        bankId={bankFilter}
        onBankChange={setBankFilter}
        contactId={contactFilter}
        onContactChange={setContactFilter}
        paymentStatus={paymentStatusFilter}
        onPaymentStatusChange={setPaymentStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={categories}
        banks={banks}
        contacts={contacts}
        onClearFilters={handleClearFilters}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Movimentações</p>
                <p className="text-2xl font-bold text-foreground">{filteredTransactions.length}</p>
                <p className="text-xs text-muted-foreground">no período filtrado</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Hash className="w-6 h-6 text-primary" />
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
        <Button
          variant={sortField === 'amount' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleSort('amount')}
          className="gap-1"
        >
          Valor
          {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        <Button
          variant={sortField === 'description' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleSort('description')}
          className="gap-1"
        >
          Descrição
          {sortField === 'description' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                    <div className="text-sm text-muted-foreground mt-1">
                      📅 {formatDate(transaction.date)}
                    </div>
                    {transaction.bank && (
                      <div className="text-sm text-muted-foreground">
                        Conta Principal
                      </div>
                    )}
                    {transaction.category && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {transaction.category.name}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
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
