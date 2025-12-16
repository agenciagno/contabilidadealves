import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Receipt,
} from 'lucide-react';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function Transactions() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all');

  const {
    transactions,
    isLoading,
    totals,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    togglePaid,
  } = useTransactions({
    month,
    year,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const { categories } = useCategories();
  const { banks } = useBanks();
  const { contacts } = useContacts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<'receita' | 'despesa'>('despesa');

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleSubmit = (data: Parameters<typeof createTransaction.mutate>[0]) => {
    if (editingTransaction) {
      updateTransaction.mutate(
        { id: editingTransaction.id, ...data },
        { onSuccess: () => { setDialogOpen(false); setEditingTransaction(null); } }
      );
    } else {
      createTransaction.mutate(data, { onSuccess: () => setDialogOpen(false) });
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

  const saldo = totals.receitas - totals.despesas;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
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
          <h1 className="text-2xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => handleNewTransaction('receita')}>
            <TrendingUp className="w-4 h-4 text-green-500" />
            Nova Receita
          </Button>
          <Button className="gap-2" onClick={() => handleNewTransaction('despesa')}>
            <TrendingDown className="w-4 h-4" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className="text-xl font-bold text-green-500">{formatCurrency(totals.receitas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(totals.despesas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${saldo >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${saldo >= 0 ? 'bg-primary/20' : 'bg-orange-500/20'}`}>
                <Receipt className={`w-5 h-5 ${saldo >= 0 ? 'text-primary' : 'text-orange-500'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo do mês</p>
                <p className={`text-xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-orange-500'}`}>
                  {formatCurrency(saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-muted-foreground text-center py-16">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma transação neste mês</p>
              <p className="text-sm mt-1">Clique em "Nova Receita" ou "Nova Despesa" para começar</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {transactions.map((transaction) => (
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
                      transaction.type === 'receita'
                        ? 'bg-green-500/20'
                        : 'bg-red-500/20'
                    }`}
                  >
                    {transaction.type === 'receita' ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
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
                      transaction.type === 'receita' ? 'text-green-500' : 'text-red-500'
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
          )}
        </CardContent>
      </Card>

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
