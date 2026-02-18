import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Building2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Bank } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { useCategories } from '@/hooks/useCategories';
import { useBankTransactions } from '@/hooks/useBankTransactions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BankDetailSheetProps {
  bank: Bank | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function BankDetailSheet({ bank, open, onOpenChange }: BankDetailSheetProps) {
  const { contacts } = useContacts();
  const { categories } = useCategories();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [contactId, setContactId] = useState<string>('all');
  const [categoryId, setCategoryId] = useState<string>('all');

  const banks = bank ? [{ id: bank.id, initial_balance: bank.initial_balance, is_active: bank.is_active }] : [];

  const { rows, openingBalance, totalIncome, totalExpense, closingBalance, isLoading } = useBankTransactions(
    {
      bankId: bank?.id ?? 'all',
      startDate: startDate || null,
      endDate: endDate || null,
      contactId: contactId === 'all' ? null : contactId,
      categoryId: categoryId === 'all' ? null : categoryId,
    },
    banks
  );

  if (!bank) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-5xl p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/50 bg-muted/30 flex-shrink-0">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: bank.color + '20' }}
            >
              <Building2 className="w-7 h-7" style={{ color: bank.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold text-foreground truncate">{bank.name}</SheetTitle>
              {(bank.bank_code || bank.agency || bank.account_number) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[bank.bank_code, bank.agency && `Ag: ${bank.agency}`, bank.account_number && `Cc: ${bank.account_number}`]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              )}
              <p className={`text-2xl font-bold mt-2 ${Number(bank.current_balance) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {formatCurrency(Number(bank.current_balance))}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-background rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground">Saldo Inicial do Período</p>
              <p className="font-semibold text-sm mt-1">{formatCurrency(openingBalance)}</p>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <p className="text-xs text-muted-foreground">Entradas</p>
              </div>
              <p className="font-semibold text-sm text-green-500 mt-1">+{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-destructive" />
                <p className="text-xs text-muted-foreground">Saídas</p>
              </div>
              <p className="font-semibold text-sm text-destructive mt-1">-{formatCurrency(totalExpense)}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-border/50 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos os clientes/fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos os eventos contábeis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statement Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Cliente/Fornecedor</TableHead>
                  <TableHead className="text-xs">Evento Contábil</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening balance row */}
                <TableRow className="bg-muted/40 hover:bg-muted/50">
                  <TableCell colSpan={4} className="text-xs text-muted-foreground italic py-2">
                    Saldo Inicial do Período
                  </TableCell>
                  <TableCell className="text-xs text-right font-semibold py-2">
                    {formatCurrency(openingBalance)}
                  </TableCell>
                </TableRow>

                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                      Nenhuma movimentação encontrada neste período
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">{row.date}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.contact_name ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {row.category_name ? (
                          <Badge variant="secondary" className="text-xs font-normal">{row.category_name}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className={`text-xs text-right font-medium ${row.type === 'receita' ? 'text-green-500' : 'text-destructive'}`}>
                        {row.type === 'receita' ? '+' : '-'}{formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        {formatCurrency(row.running_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* Closing balance row */}
                {rows.length > 0 && (
                  <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                    <TableCell colSpan={4} className="text-xs text-muted-foreground italic py-2">
                      Saldo Final do Período
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold py-2">
                      {formatCurrency(closingBalance)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
