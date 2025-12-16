import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths, subDays, startOfYear } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { useReportData, processReportData, exportToCSV, exportToPDF } from '@/hooks/useReportData';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportSummary } from '@/components/reports/ReportSummary';
import { CategoryPieChart } from '@/components/reports/CategoryPieChart';
import { MonthlyBarChart } from '@/components/reports/MonthlyBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type QuickPeriod = 'thisMonth' | 'lastMonth' | 'thisYear' | 'last30Days' | 'last15Days' | null;

export default function Reports() {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [categoryId, setCategoryId] = useState('all');
  const [bankId, setBankId] = useState('all');
  const [transactionType, setTransactionType] = useState('all');
  const [contactId, setContactId] = useState('all');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('thisMonth');

  const { categories = [] } = useCategories();
  const { banks = [] } = useBanks();
  const { contacts = [] } = useContacts();

  const { data: transactions = [], isLoading } = useReportData({
    startDate,
    endDate,
    categoryId,
    bankId,
    transactionType,
    contactId,
  });

  const reportData = useMemo(() => processReportData(transactions), [transactions]);

  const handleQuickPeriodChange = (period: QuickPeriod) => {
    setQuickPeriod(period);
    const today = new Date();
    
    switch (period) {
      case 'thisMonth':
        setStartDate(startOfMonth(today));
        setEndDate(today);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'thisYear':
        setStartDate(startOfYear(today));
        setEndDate(today);
        break;
      case 'last30Days':
        setStartDate(subDays(today, 30));
        setEndDate(today);
        break;
      case 'last15Days':
        setStartDate(subDays(today, 15));
        setEndDate(today);
        break;
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setQuickPeriod(null);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setQuickPeriod(null);
  };

  const handleExportCSV = () => {
    exportToCSV(transactions);
  };

  const handleExportPDF = () => {
    exportToPDF(transactions, reportData.totals, startDate, endDate);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
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
        <h1 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
        <p className="text-muted-foreground">
          Análise detalhada das suas finanças com comparativos e exportação de dados
        </p>
      </div>

      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        bankId={bankId}
        onBankChange={setBankId}
        transactionType={transactionType}
        onTransactionTypeChange={setTransactionType}
        contactId={contactId}
        onContactChange={setContactId}
        categories={categories}
        banks={banks}
        contacts={contacts}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        quickPeriod={quickPeriod}
        onQuickPeriodChange={handleQuickPeriodChange}
      />

      <ReportSummary
        totalReceitas={reportData.totals.receitas}
        totalDespesas={reportData.totals.despesas}
        transactionCount={transactions.length}
        startDate={startDate}
        endDate={endDate}
      />

      <MonthlyBarChart data={reportData.monthlyData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPieChart data={reportData.receitasByCategory} title="Receitas por Categoria" />
        <CategoryPieChart data={reportData.despesasByCategory} title="Despesas por Categoria" />
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma transação encontrada</p>
              <p className="text-sm">Ajuste os filtros para visualizar transações</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 10).map((t) => (
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
                      <TableCell>
                        {t.contact && (
                          <span className="text-sm text-primary">{t.contact.name}</span>
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
              {transactions.length > 10 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 10 de {transactions.length} transações
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
