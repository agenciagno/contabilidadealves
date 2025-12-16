import { useState, useMemo } from 'react';
import { startOfMonth, subMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useReportData, processReportData, exportToCSV } from '@/hooks/useReportData';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportSummary } from '@/components/reports/ReportSummary';
import { CategoryPieChart } from '@/components/reports/CategoryPieChart';
import { MonthlyBarChart } from '@/components/reports/MonthlyBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function Reports() {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(subMonths(new Date(), 2)));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [categoryId, setCategoryId] = useState('all');
  const [bankId, setBankId] = useState('all');
  const [transactionType, setTransactionType] = useState('all');

  const { categories = [] } = useCategories();
  const { banks = [] } = useBanks();

  const { data: transactions = [], isLoading } = useReportData({
    startDate,
    endDate,
    categoryId,
    bankId,
    transactionType,
  });

  const reportData = useMemo(() => processReportData(transactions), [transactions]);

  const handleExportCSV = () => {
    exportToCSV(transactions);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Analise suas finanças em detalhes</p>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <ReportFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            bankId={bankId}
            onBankChange={setBankId}
            transactionType={transactionType}
            onTransactionTypeChange={setTransactionType}
            categories={categories}
            banks={banks}
            onExportCSV={handleExportCSV}
          />
        </CardContent>
      </Card>

      <ReportSummary
        totalReceitas={reportData.totals.receitas}
        totalDespesas={reportData.totals.despesas}
        transactionCount={transactions.length}
      />

      <MonthlyBarChart data={reportData.monthlyData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPieChart data={reportData.receitasByCategory} title="Receitas por Categoria" />
        <CategoryPieChart data={reportData.despesasByCategory} title="Despesas por Categoria" />
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transações do Período</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma transação encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 50).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(t.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {t.type === 'receita' ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          {t.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.category && (
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: `${t.category.color}20`, color: t.category.color }}
                          >
                            {t.category.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.bank && (
                          <span className="text-sm text-muted-foreground">{t.bank.name}</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          t.type === 'receita' ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {t.type === 'receita' ? '+' : '-'}
                        {formatCurrency(Number(t.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_paid ? 'default' : 'secondary'}>
                          {t.is_paid ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {transactions.length > 50 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 50 de {transactions.length} transações
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
