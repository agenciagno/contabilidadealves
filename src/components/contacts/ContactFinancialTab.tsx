import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Clock, CalendarPlus, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { useContactTransactions } from '@/hooks/useContactTransactions';
import { ContactContractsCard } from './ContactContractsCard';
import { RecurringFormDialog } from '@/components/recurring/RecurringFormDialog';
import { useRecurringTransactions, RecurringTransactionInsert } from '@/hooks/useRecurringTransactions';
import { createAuditLog } from '@/hooks/useAuditLog';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactFinancialTabProps {
  contactId: string;
  contactName: string;
}

type SortOrder = 'newest' | 'oldest';

export function ContactFinancialTab({ contactId, contactName }: ContactFinancialTabProps) {
  const { data: transactions, isLoading } = useContactTransactions(contactId);
  const { createRecurring } = useRecurringTransactions();
  const queryClient = useQueryClient();
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const handleRecurringSubmit = async (data: RecurringTransactionInsert) => {
    try {
      await createRecurring.mutateAsync(data);
      await createAuditLog({
        contactId,
        action: 'HONORARIO_GERADO',
        description: `Recorrência criada: ${data.description} - R$ ${data.amount.toFixed(2).replace('.', ',')}`,
      });
      queryClient.invalidateQueries({ queryKey: ['contact-recurrings', contactId] });
      setRecurringDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar recorrência:', error);
    }
  };

  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [transactions, sortOrder]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const summary = {
    totalPago: transactions
      ?.filter(t => t.is_paid)
      .reduce((acc, t) => acc + (t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount)), 0) || 0,
    totalPendente: transactions
      ?.filter(t => !t.is_paid && !(t.due_date && t.due_date < today))
      .reduce((acc, t) => acc + Number(t.amount), 0) || 0,
    totalVencido: transactions
      ?.filter(t => t.type === 'receita' && !t.is_paid && t.due_date && t.due_date < today)
      .reduce((acc, t) => acc + Number(t.amount), 0) || 0,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards - With Generate Fees Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Pago</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">
                {formatCurrency(summary.totalPago)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Pendente</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">
                {formatCurrency(summary.totalPendente)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Vencido</span>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {formatCurrency(summary.totalVencido)}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Button onClick={() => setRecurringDialogOpen(true)} className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          Gerar Recorrência
        </Button>
      </div>

      {/* Active Contracts */}
      <ContactContractsCard contactId={contactId} />

      {/* Transactions Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Histórico de Transações</CardTitle>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction) => {
                  const isOverdue = !transaction.is_paid && 
                    transaction.due_date && 
                    transaction.due_date < today;

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {transaction.type === 'despesa' && '-'}
                        {formatCurrency(Number(transaction.amount))}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {transaction.due_date 
                          ? format(new Date(transaction.due_date), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {transaction.is_paid ? (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                            Pago
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive">Vencido</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma transação encontrada para este cliente/fornecedor
            </div>
          )}
        </CardContent>
      </Card>

      <RecurringFormDialog
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        onSubmit={handleRecurringSubmit}
        isLoading={createRecurring.isPending}
        initialContactId={contactId}
      />
    </div>
  );
}
