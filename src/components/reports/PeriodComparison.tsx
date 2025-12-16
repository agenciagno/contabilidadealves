import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PeriodData {
  receitas: number;
  despesas: number;
  saldo: number;
}

interface PeriodComparisonProps {
  currentPeriod: PeriodData;
  previousPeriod: PeriodData;
  currentLabel?: string;
  previousLabel?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const calculateVariation = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export function PeriodComparison({
  currentPeriod,
  previousPeriod,
  currentLabel = 'Este Mês',
  previousLabel = 'Mês Anterior',
}: PeriodComparisonProps) {
  const receitasVariation = calculateVariation(currentPeriod.receitas, previousPeriod.receitas);
  const despesasVariation = calculateVariation(currentPeriod.despesas, previousPeriod.despesas);
  const saldoVariation = calculateVariation(currentPeriod.saldo, previousPeriod.saldo);

  const getVariationIcon = (variation: number, isExpense = false) => {
    if (Math.abs(variation) < 0.5) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (variation > 0) {
      return isExpense ? (
        <ArrowUpRight className="h-4 w-4 text-red-500" />
      ) : (
        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
      );
    }
    return isExpense ? (
      <ArrowDownRight className="h-4 w-4 text-emerald-500" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-500" />
    );
  };

  const getVariationColor = (variation: number, isExpense = false) => {
    if (Math.abs(variation) < 0.5) return 'text-muted-foreground';
    if (variation > 0) return isExpense ? 'text-red-500' : 'text-emerald-500';
    return isExpense ? 'text-emerald-500' : 'text-red-500';
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Comparativo de Períodos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Receitas */}
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Receitas</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${getVariationColor(receitasVariation)}`}>
                {getVariationIcon(receitasVariation)}
                {receitasVariation.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentLabel}</span>
                <span className="font-medium">{formatCurrency(currentPeriod.receitas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{previousLabel}</span>
                <span className="text-muted-foreground">{formatCurrency(previousPeriod.receitas)}</span>
              </div>
            </div>
          </div>

          {/* Despesas */}
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-600 dark:text-red-400">Despesas</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${getVariationColor(despesasVariation, true)}`}>
                {getVariationIcon(despesasVariation, true)}
                {despesasVariation.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentLabel}</span>
                <span className="font-medium">{formatCurrency(currentPeriod.despesas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{previousLabel}</span>
                <span className="text-muted-foreground">{formatCurrency(previousPeriod.despesas)}</span>
              </div>
            </div>
          </div>

          {/* Saldo */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary">Saldo</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${getVariationColor(saldoVariation)}`}>
                {getVariationIcon(saldoVariation)}
                {saldoVariation.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentLabel}</span>
                <span className={`font-medium ${currentPeriod.saldo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(currentPeriod.saldo)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{previousLabel}</span>
                <span className={`text-muted-foreground`}>
                  {formatCurrency(previousPeriod.saldo)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
