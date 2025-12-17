import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { useContactTransactions } from '@/hooks/useContactTransactions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactFinancialTabProps {
  contactId: string;
}

export function ContactFinancialTab({ contactId }: ContactFinancialTabProps) {
  const { data: transactions, isLoading } = useContactTransactions(contactId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const summary = {
    totalReceitas: transactions
      ?.filter(t => t.type === 'receita')
      .reduce((acc, t) => acc + Number(t.amount), 0) || 0,
    totalDespesas: transactions
      ?.filter(t => t.type === 'despesa')
      .reduce((acc, t) => acc + Number(t.amount), 0) || 0,
    pendentes: transactions?.filter(t => !t.is_paid).length || 0,
    vencidas: transactions?.filter(t => !t.is_paid && t.due_date && t.due_date < today).length || 0,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total Receitas</span>
            </div>
            <p className="text-xl font-bold text-emerald-500">
              {formatCurrency(summary.totalReceitas)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Total Despesas</span>
            </div>
            <p className="text-xl font-bold text-red-500">
              {formatCurrency(summary.totalDespesas)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-xl font-bold text-yellow-500">{summary.pendentes}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Vencidas</span>
            </div>
            <p className="text-xl font-bold text-destructive">{summary.vencidas}</p>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>
                        {transaction.category ? (
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: transaction.category.color || undefined,
                              color: transaction.category.color || undefined 
                            }}
                          >
                            {transaction.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={transaction.type === 'receita' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-red-500/10 text-red-500'
                          }
                        >
                          {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {transaction.type === 'despesa' && '-'}
                        {formatCurrency(Number(transaction.amount))}
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
    </div>
  );
}
