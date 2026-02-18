import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, List } from 'lucide-react';
import { Bank } from '@/hooks/useBanks';
import { useContacts } from '@/hooks/useContacts';
import { useCategories } from '@/hooks/useCategories';
import { useBankTransactions } from '@/hooks/useBankTransactions';

interface UnifiedStatementAccordionProps {
  banks: Bank[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function UnifiedStatementAccordion({ banks }: UnifiedStatementAccordionProps) {
  const { contacts } = useContacts();
  const { categories } = useCategories();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(lastOfMonth);
  const [contactId, setContactId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [bankId, setBankId] = useState('all');

  const banksList = banks.map(b => ({ id: b.id, initial_balance: b.initial_balance, is_active: b.is_active }));

  const { rows, openingBalance, totalIncome, totalExpense, closingBalance, isLoading } = useBankTransactions(
    {
      bankId: bankId as string,
      startDate: startDate || null,
      endDate: endDate || null,
      contactId: contactId === 'all' ? null : contactId,
      categoryId: categoryId === 'all' ? null : categoryId,
    },
    banksList
  );

  const bankColorMap = banks.reduce<Record<string, string>>((acc, b) => {
    acc[b.id] = b.color;
    return acc;
  }, {});

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="unified" className="border border-border/50 rounded-xl bg-card overflow-hidden">
        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <List className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground text-base">Extrato Unificado</span>
            <Badge variant="secondary" className="text-xs">{rows.length} lançamentos</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          {/* Filters */}
          <div className="space-y-3 mt-2 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todos os bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {banks.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos os eventos contábeis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground">Saldo Inicial</p>
              <p className="font-semibold text-sm mt-1">{formatCurrency(openingBalance)}</p>
            </div>
            <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/20">
              <p className="text-xs text-muted-foreground">Total Entradas</p>
              <p className="font-semibold text-sm text-green-500 mt-1">+{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
              <p className="text-xs text-muted-foreground">Total Saídas</p>
              <p className="font-semibold text-sm text-destructive mt-1">-{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Banco</TableHead>
                    <TableHead className="text-xs">Cliente/Fornecedor</TableHead>
                    <TableHead className="text-xs">Evento Contábil</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={5} className="text-xs text-muted-foreground italic py-2">
                      Saldo Inicial do Período
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold py-2">
                      {formatCurrency(openingBalance)}
                    </TableCell>
                  </TableRow>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                        Nenhuma movimentação encontrada neste período
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => {
                      const color = row.bank_id ? bankColorMap[row.bank_id] : undefined;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">{row.date}</TableCell>
                          <TableCell className="text-xs">
                            {row.bank_name ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#888' }} />
                                {row.bank_name}
                              </div>
                            ) : '—'}
                          </TableCell>
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
                      );
                    })
                  )}
                  {rows.length > 0 && (
                    <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                      <TableCell colSpan={5} className="text-xs text-muted-foreground italic py-2">
                        Saldo Final do Período
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold py-2">
                        {formatCurrency(closingBalance)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
