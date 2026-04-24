import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { CashFlowTab } from '@/components/transactions/CashFlowTab';
import { MonthlyConsultTab } from '@/components/transactions/MonthlyConsultTab';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function PagarReceber() {
  const { transactions: allTransactions, isLoading, togglePaid } = useTransactions();
  const { categories } = useCategories();
  const { banks } = useBanks();
  const { contacts } = useContacts();

  const [view, setView] = useState<'all' | 'monthly'>('all');

  // Filter out transactions linked to invisible banks
  const invisibleBankIds = new Set(banks.filter(b => b.is_invisible).map(b => b.id));
  const transactions = allTransactions.filter(t => !t.bank_id || !invisibleBankIds.has(t.bank_id));

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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pagar / Receber</h1>
          <p className="text-muted-foreground">Fluxo de caixa com projeção de saldo linha a linha</p>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as 'all' | 'monthly')}
          className="bg-muted/40 rounded-xl p-1 border border-border/40"
        >
          <ToggleGroupItem
            value="all"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-lg px-4 h-9 text-sm"
          >
            Todas as transações
          </ToggleGroupItem>
          <ToggleGroupItem
            value="monthly"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-lg px-4 h-9 text-sm"
          >
            Consulta Mensal
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === 'all' ? (
        <CashFlowTab
          transactions={transactions}
          banks={banks}
          categories={categories}
          contacts={contacts}
          togglePaid={togglePaid}
        />
      ) : (
        <MonthlyConsultTab transactions={transactions} />
      )}
    </div>
  );
}
