import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBanks } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { CashFlowTab } from '@/components/transactions/CashFlowTab';
import { Skeleton } from '@/components/ui/skeleton';

export default function PagarReceber() {
  const { transactions, isLoading, togglePaid } = useTransactions();
  const { categories } = useCategories();
  const { banks } = useBanks();
  const { contacts } = useContacts();

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pagar / Receber</h1>
        <p className="text-muted-foreground">Fluxo de caixa com projeção de saldo linha a linha</p>
      </div>

      <CashFlowTab
        transactions={transactions}
        banks={banks}
        categories={categories}
        contacts={contacts}
        togglePaid={togglePaid}
      />
    </div>
  );
}
