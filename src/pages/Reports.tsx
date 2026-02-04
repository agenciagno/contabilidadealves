import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths, subDays, startOfYear, addMonths, addDays, differenceInDays, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { useReportData, processReportData, exportToCSV, exportToPDF } from '@/hooks/useReportData';
import { ReportFilters, QuickPeriod } from '@/components/reports/ReportFilters';
import { ReportSummary } from '@/components/reports/ReportSummary';
import { CategoryPieChart } from '@/components/reports/CategoryPieChart';
import { MonthlyBarChart } from '@/components/reports/MonthlyBarChart';
import { PeriodComparison } from '@/components/reports/PeriodComparison';
import { BalanceEvolutionChart } from '@/components/reports/BalanceEvolutionChart';
import { CashFlowForecast } from '@/components/reports/CashFlowForecast';
import { DRECard } from '@/components/reports/DRECard';
import { ClientDelinquencyTable } from '@/components/reports/ClientDelinquencyTable';
import { TaxRegimeChart } from '@/components/reports/TaxRegimeChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Users } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function Reports() {
  const [activeTab, setActiveTab] = useState('financial');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [categoryId, setCategoryId] = useState('all');
  const [bankId, setBankId] = useState('all');
  const [transactionType, setTransactionType] = useState('all');
  const [contactId, setContactId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('thisMonth');
  const [balanceGroupBy, setBalanceGroupBy] = useState<'month' | 'week'>('month');

  const { categories = [] } = useCategories();
  const { banks = [] } = useBanks();
  const { contacts = [] } = useContacts();

  // Current period data
  const { data: transactions = [], isLoading } = useReportData({
    startDate,
    endDate,
    categoryId,
    bankId,
    transactionType,
    contactId,
    paymentStatus,
  });

  // All unpaid transactions for delinquency analysis
  const { data: allUnpaidTransactions = [] } = useReportData({
    startDate: undefined,
    endDate: new Date(),
    paymentStatus: 'pending',
  });

  // Previous month data for comparison
  const today = new Date();
  const lastMonthStart = startOfMonth(subMonths(today, 1));
  const lastMonthEnd = endOfMonth(subMonths(today, 1));
  const thisMonthStart = startOfMonth(today);

  const { data: thisMonthTransactions = [] } = useReportData({
    startDate: thisMonthStart,
    endDate: today,
  });

  const { data: lastMonthTransactions = [] } = useReportData({
    startDate: lastMonthStart,
    endDate: lastMonthEnd,
  });

  const reportData = useMemo(() => processReportData(transactions), [transactions]);
  const thisMonthData = useMemo(() => processReportData(thisMonthTransactions), [thisMonthTransactions]);
  const lastMonthData = useMemo(() => processReportData(lastMonthTransactions), [lastMonthTransactions]);

  // Calculate DRE values
  const dreData = useMemo(() => {
    const faturamentoBruto = reportData.totals.receitas;
    // Assume impostos são 15% do faturamento (pode ser ajustado)
    const impostos = faturamentoBruto * 0.15;
    const despesasOperacionais = reportData.totals.despesas;
    return { faturamentoBruto, impostos, despesasOperacionais };
  }, [reportData]);

  // Calculate delinquent clients
  const delinquentClients = useMemo(() => {
    const clientMap = new Map<string, { id: string; name: string; phone?: string | null; openAmount: number; oldestDueDate: Date }>();
    
    allUnpaidTransactions
      .filter(t => t.type === 'receita' && t.due_date && t.contact)
      .forEach(t => {
        const dueDate = parseISO(t.due_date!);
        const daysOverdue = differenceInDays(today, dueDate);
        
        if (daysOverdue > 0) {
          const existing = clientMap.get(t.contact!.id);
          if (existing) {
            existing.openAmount += Number(t.amount);
            if (dueDate < existing.oldestDueDate) {
              existing.oldestDueDate = dueDate;
            }
          } else {
            clientMap.set(t.contact!.id, {
              id: t.contact!.id,
              name: t.contact!.name,
              phone: t.contact!.phone,
              openAmount: Number(t.amount),
              oldestDueDate: dueDate,
            });
          }
        }
      });

    return Array.from(clientMap.values())
      .map(client => ({
        ...client,
        daysOverdue: differenceInDays(today, client.oldestDueDate),
      }))
      .sort((a, b) => b.openAmount - a.openAmount);
  }, [allUnpaidTransactions]);

  // Calculate revenue by tax regime
  const taxRegimeData = useMemo(() => {
    const regimeMap = new Map<string, number>();
    const colors: Record<string, string> = {
      'Simples Nacional': '#10B981',
      'Lucro Presumido': '#3B82F6',
      'Lucro Real': '#8B5CF6',
      'MEI': '#F59E0B',
      'Outros': '#6B7280',
    };

    transactions
      .filter(t => t.type === 'receita' && t.contact)
      .forEach(t => {
        const regime = t.contact?.tax_regime || 'Outros';
        const current = regimeMap.get(regime) || 0;
        regimeMap.set(regime, current + Number(t.amount));
      });

    return Array.from(regimeMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name] || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const handleQuickPeriodChange = (period: QuickPeriod) => {
    setQuickPeriod(period);
    const now = new Date();
    
    switch (period) {
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(now);
        setPaymentStatus('all');
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        setPaymentStatus('all');
        break;
      case 'thisYear':
        setStartDate(startOfYear(now));
        setEndDate(now);
        setPaymentStatus('all');
        break;
      case 'last30Days':
        setStartDate(subDays(now, 30));
        setEndDate(now);
        setPaymentStatus('all');
        break;
      case 'last15Days':
        setStartDate(subDays(now, 15));
        setEndDate(now);
        setPaymentStatus('all');
        break;
      case 'nextMonth':
        const nextMonth = addMonths(now, 1);
        setStartDate(startOfMonth(nextMonth));
        setEndDate(endOfMonth(nextMonth));
        setPaymentStatus('pending');
        break;
      case 'next30Days':
        setStartDate(now);
        setEndDate(addDays(now, 30));
        setPaymentStatus('pending');
        break;
      case 'next15Days':
        setStartDate(now);
        setEndDate(addDays(now, 15));
        setPaymentStatus('pending');
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
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">
          Análise detalhada das suas finanças e clientes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
        </TabsList>

        {/* Financial Reports Tab */}
        <TabsContent value="financial" className="space-y-6">
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
            paymentStatus={paymentStatus}
            onPaymentStatusChange={setPaymentStatus}
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

          {/* DRE Card */}
          <DRECard
            faturamentoBruto={dreData.faturamentoBruto}
            impostos={dreData.impostos}
            despesasOperacionais={dreData.despesasOperacionais}
          />

          <PeriodComparison
            currentPeriod={{
              receitas: thisMonthData.totals.receitas,
              despesas: thisMonthData.totals.despesas,
              saldo: thisMonthData.totals.receitas - thisMonthData.totals.despesas,
            }}
            previousPeriod={{
              receitas: lastMonthData.totals.receitas,
              despesas: lastMonthData.totals.despesas,
              saldo: lastMonthData.totals.receitas - lastMonthData.totals.despesas,
            }}
          />

          <BalanceEvolutionChart 
            data={reportData.balanceEvolution} 
            weeklyData={reportData.weeklyBalanceEvolution}
            groupBy={balanceGroupBy}
            onGroupByChange={setBalanceGroupBy}
          />

          <CashFlowForecast />

          <MonthlyBarChart data={reportData.monthlyData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategoryPieChart data={reportData.receitasByCategory} title="Receitas por Evento Contábil" />
            <CategoryPieChart data={reportData.despesasByCategory} title="Despesas por Evento Contábil" />
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
                        <TableHead>Evento Contábil</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Cliente/Fornecedor</TableHead>
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
        </TabsContent>

        {/* Client Reports Tab */}
        <TabsContent value="clients" className="space-y-6">
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
            paymentStatus={paymentStatus}
            onPaymentStatusChange={setPaymentStatus}
            categories={categories}
            banks={banks}
            contacts={contacts}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            quickPeriod={quickPeriod}
            onQuickPeriodChange={handleQuickPeriodChange}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientDelinquencyTable clients={delinquentClients} />
            <TaxRegimeChart data={taxRegimeData} />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Clientes</p>
                    <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Inadimplentes</p>
                    <p className="text-2xl font-bold text-red-500">{delinquentClients.length}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Adimplência</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      {contacts.length > 0 
                        ? ((1 - delinquentClients.length / contacts.length) * 100).toFixed(1)
                        : 100}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
