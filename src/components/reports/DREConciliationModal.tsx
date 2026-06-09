import { useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useCategories';
import { useContacts } from '@/hooks/useContacts';
import { useBanks } from '@/hooks/useBanks';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function formatDateBR(d: string | null) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

interface ConciliationTxn {
  id: string;
  description: string;
  amount: number;
  paid_amount: number | null;
  is_paid: boolean;
  expected_date: string | null;
  date: string | null;
  category_id: string | null;
  contact_id: string | null;
  bank_id: string | null;
}

export function DREConciliationModal({ open, onOpenChange, startDate, endDate }: Props) {
  const { categories } = useCategories();
  const { contacts } = useContacts();
  const { banks } = useBanks();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Fetch all transactions with expected_date in period (same scope as DRE Previsto)
  const { data: txns = [], isLoading } = useQuery({
    queryKey: ['dre-conciliation', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, description, amount, paid_amount, is_paid, expected_date, date, category_id, contact_id, bank_id')
        .is('deleted_at', null)
        .not('expected_date', 'is', null)
        .gte('expected_date', startDate)
        .lte('expected_date', endDate);
      if (error) throw error;
      return (data || []) as ConciliationTxn[];
    },
    enabled: open && !!startDate && !!endDate,
  });

  const invisibleBankIds = useMemo(
    () => new Set(banks.filter(b => b.is_invisible).map(b => b.id)),
    [banks]
  );

  // Group by macro event (parent category)
  const grouped = useMemo(() => {
    const catMap = new Map(categories.map(c => [c.id, c]));
    type Group = {
      key: string;
      macroName: string;
      previstoDRE: number;
      emAberto: number;
      pagasComPrevista: number;
      foraDoPagarReceber: number; // banks invisible
      txns: ConciliationTxn[];
      showInDre: boolean;
    };
    const map = new Map<string, Group>();

    for (const t of txns) {
      const cat = t.category_id ? catMap.get(t.category_id) : null;
      const macro = cat?.parent_id ? catMap.get(cat.parent_id) : cat;
      const key = macro?.id || '__sem__';
      const macroName = macro?.name || '(Sem evento contábil)';
      const showInDre = macro ? macro.show_in_dre !== false : true;

      let g = map.get(key);
      if (!g) {
        g = { key, macroName, previstoDRE: 0, emAberto: 0, pagasComPrevista: 0, foraDoPagarReceber: 0, txns: [], showInDre };
        map.set(key, g);
      }
      const amt = Number(t.amount);
      g.previstoDRE += amt;
      if (!t.is_paid) g.emAberto += amt;
      else g.pagasComPrevista += amt;
      if (t.bank_id && invisibleBankIds.has(t.bank_id)) g.foraDoPagarReceber += amt;
      g.txns.push(t);
    }

    return Array.from(map.values()).sort((a, b) => b.previstoDRE - a.previstoDRE);
  }, [txns, categories, invisibleBankIds]);

  const totals = useMemo(() => {
    return grouped.reduce(
      (acc, g) => {
        acc.previstoDRE += g.previstoDRE;
        acc.emAberto += g.emAberto;
        acc.pagasComPrevista += g.pagasComPrevista;
        return acc;
      },
      { previstoDRE: 0, emAberto: 0, pagasComPrevista: 0 }
    );
  }, [grouped]);

  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  const contactName = (id: string | null) => id ? (contacts.find(c => c.id === id)?.name || '—') : '—';
  const bankName = (id: string | null) => id ? (banks.find(b => b.id === id)?.name || '—') : '—';

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Conciliação DRE × Pagar/Receber', 14, 14);
    doc.setFontSize(9);
    doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, 14, 20);

    const body = grouped.map(g => {
      const diff = g.previstoDRE - (g.emAberto + g.pagasComPrevista);
      return [
        g.macroName + (g.showInDre ? '' : ' (fora da DRE)'),
        formatCurrency(g.previstoDRE),
        formatCurrency(g.emAberto),
        formatCurrency(g.pagasComPrevista),
        formatCurrency(diff),
      ];
    });

    autoTable(doc, {
      startY: 26,
      head: [['Evento Contábil', 'Previsto DRE', 'Em Aberto (Pagar/Receber)', 'Pagas c/ Data Prevista', 'Diferença']],
      body,
      foot: [[
        'TOTAL',
        formatCurrency(totals.previstoDRE),
        formatCurrency(totals.emAberto),
        formatCurrency(totals.pagasComPrevista),
        formatCurrency(totals.previstoDRE - totals.emAberto - totals.pagasComPrevista),
      ]],
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: [30, 41, 59], halign: 'center' },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'left' },
      },
    });

    doc.save(`conciliacao-dre-${startDate}_${endDate}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Conciliação DRE × Pagar/Receber</span>
            <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5">
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-2 leading-relaxed">
          <p>
            Período: <strong>{formatDateBR(startDate)} a {formatDateBR(endDate)}</strong>.
            Esta tabela ajuda a entender a diferença entre o <strong>Previsto da DRE</strong> e o que aparece em <strong>Pagar/Receber</strong>:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li><strong>Previsto DRE</strong>: tudo que tem data prevista no período (pagas + em aberto).</li>
            <li><strong>Em Aberto</strong>: parcela do Previsto que ainda não foi liquidada — é o que aparece em Pagar/Receber.</li>
            <li><strong>Pagas c/ Data Prevista</strong>: já liquidadas, mas continuam compondo o Previsto da DRE.</li>
            <li><strong>Diferença</strong>: deve ser zero. Se não for, indica banco invisível ou categoria fora da DRE.</li>
          </ul>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma transação com data prevista no período.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[8px]"></TableHead>
                <TableHead>Evento Contábil</TableHead>
                <TableHead className="text-right">Previsto DRE</TableHead>
                <TableHead className="text-right">Em Aberto</TableHead>
                <TableHead className="text-right">Pagas c/ Prevista</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(g => {
                const diff = g.previstoDRE - (g.emAberto + g.pagasComPrevista);
                const isOpen = !!expanded[g.key];
                return (
                  <>
                    <TableRow key={g.key} className="cursor-pointer hover:bg-muted/40" onClick={() => toggle(g.key)}>
                      <TableCell className="px-2">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {g.macroName}
                          {!g.showInDre && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <AlertCircle className="h-3 w-3" /> fora da DRE
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(g.previstoDRE)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(g.emAberto)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(g.pagasComPrevista)}</TableCell>
                      <TableCell className={cn('text-right font-semibold', Math.abs(diff) > 0.001 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                        {formatCurrency(diff)}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={g.key + '-detail'}>
                        <TableCell colSpan={6} className="bg-muted/20 p-0">
                          <div className="p-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Data Prevista</TableHead>
                                  <TableHead className="text-xs">Data Pagto.</TableHead>
                                  <TableHead className="text-xs">Cliente/Fornecedor</TableHead>
                                  <TableHead className="text-xs">Conta Corrente</TableHead>
                                  <TableHead className="text-right text-xs">Valor</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {g.txns
                                  .slice()
                                  .sort((a, b) => (a.expected_date || '').localeCompare(b.expected_date || ''))
                                  .map(t => (
                                    <TableRow key={t.id}>
                                      <TableCell className="text-xs">{formatDateBR(t.expected_date)}</TableCell>
                                      <TableCell className="text-xs">{formatDateBR(t.date)}</TableCell>
                                      <TableCell className="text-xs">{contactName(t.contact_id)}</TableCell>
                                      <TableCell className="text-xs">{bankName(t.bank_id)}</TableCell>
                                      <TableCell className="text-right text-xs">{formatCurrency(Number(t.amount))}</TableCell>
                                      <TableCell className="text-xs">
                                        {t.is_paid ? (
                                          <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600">Pago</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">Em aberto</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell></TableCell>
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.previstoDRE)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.emAberto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.pagasComPrevista)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.previstoDRE - totals.emAberto - totals.pagasComPrevista)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
