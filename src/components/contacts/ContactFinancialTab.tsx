import { useState } from 'react';
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
import { TrendingUp, Clock, CalendarPlus } from 'lucide-react';
import { useContactTransactions } from '@/hooks/useContactTransactions';
import { ContactContractsCard } from './ContactContractsCard';
import { GenerateFeesDialog } from './GenerateFeesDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactFinancialTabProps {
  contactId: string;
  contactName: string;
}

export function ContactFinancialTab({ contactId, contactName }: ContactFinancialTabProps) {
  const { data: transactions, isLoading } = useContactTransactions(contactId);
  const [feesDialogOpen, setFeesDialogOpen] = useState(false);

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
      .reduce((acc, t) => acc + Number(t.amount), 0) || 0,
    totalPendente: transactions
      ?.filter(t => !t.is_paid)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
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
        </div>
        
        <Button onClick={() => setFeesDialogOpen(true)} className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          Gerar Honorários Recorrentes
        </Button>
      </div>

      {/* Active Contracts */}
      <ContactContractsCard contactId={contactId} />

      {/* Transactions Table */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
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
                {transactions.map((transaction) => {
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
              Nenhuma transação encontrada para este contato
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateFeesDialog
        open={feesDialogOpen}
        onOpenChange={setFeesDialogOpen}
        contactId={contactId}
        contactName={contactName}
      />
    </div>
  );
}
