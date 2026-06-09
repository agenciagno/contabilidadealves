import { Fragment, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, FileText, AlertCircle, Eraser, Pencil, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCategories } from '@/hooks/useCategories';
import { useContacts } from '@/hooks/useContacts';
import { useBanks } from '@/hooks/useBanks';
import { useToast } from '@/hooks/use-toast';
import { BulkEditDialog } from '@/components/transactions/BulkEditDialog';
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

// Heuristic: paid AND expected_date filled AND expected_date === payment date → likely À Vista legacy
function isSuspectAVista(t: ConciliationTxn) {
  return t.is_paid && !!t.expected_date && !!t.date && t.expected_date === t.date;
}

export function DREConciliationModal({ open, onOpenChange, startDate, endDate }: Props) {
  const { categories } = useCategories();
  const { contacts } = useContacts();
  const { banks } = useBanks();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const grouped = useMemo(() => {
    type Group = {
      key: string;
      macroName: string;
      previstoDRE: number;
      emAberto: number;
      pagasComPrevista: number;
      suspeitasAVista: number;
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
        g = { key, macroName, previstoDRE: 0, emAberto: 0, pagasComPrevista: 0, suspeitasAVista: 0, txns: [], showInDre };
        map.set(key, g);
      }
      const amt = Number(t.amount);
      g.previstoDRE += amt;
      if (!t.is_paid) g.emAberto += amt;
      else g.pagasComPrevista += amt;
      if (isSuspectAVista(t)) g.suspeitasAVista += amt;
      g.txns.push(t);
    }

    return Array.from(map.values()).sort((a, b) => b.previstoDRE - a.previstoDRE);
  }, [txns, catMap]);

  const totals = useMemo(() => {
    return grouped.reduce(
      (acc, g) => {
        acc.previstoDRE += g.previstoDRE;
        acc.emAberto += g.emAberto;
        acc.pagasComPrevista += g.pagasComPrevista;
        acc.suspeitasAVista += g.suspeitasAVista;
        return acc;
      },
      { previstoDRE: 0, emAberto: 0, pagasComPrevista: 0, suspeitasAVista: 0 }
    );
  }, [grouped]);

  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  const contactName = (id: string | null) => id ? (contacts.find(c => c.id === id)?.name || '—') : '—';
  const bankName = (id: string | null) => id ? (banks.find(b => b.id === id)?.name || '—') : '—';
  const subEventName = (categoryId: string | null) => {
    if (!categoryId) return '—';
    const cat = catMap.get(categoryId);
    if (!cat) return '—';
    // Only show name when it's a sub-event (has parent). If it's the macro itself, dash.
    return cat.parent_id ? cat.name : '—';
  };

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectGroup = (txnIds: string[], checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      txnIds.forEach(id => checked ? next.add(id) : next.delete(id));
      return next;
    });
  };

  const selectSuspeitas = (txnsArr: ConciliationTxn[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      txnsArr.filter(isSuspectAVista).forEach(t => next.add(t.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectedTxns = useMemo(
    () => txns.filter(t => selected.has(t.id)),
    [txns, selected]
  );

  const handleClearExpected = async () => {
    setClearing(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from('transactions')
        .update({ expected_date: null })
        .in('id', ids);
      if (error) throw error;
      toast({ title: `Data Prevista removida em ${ids.length} transação(ões).` });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dre-conciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['dre-previsto'] }),
        queryClient.invalidateQueries({ queryKey: ['dre-realizado'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['server-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['transaction-kpis'] }),
      ]);
      clearSelection();
      setConfirmClearOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro ao limpar Data Prevista', description: err.message, variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

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
        formatCurrency(g.suspeitasAVista),
        formatCurrency(diff),
      ];
    });

    autoTable(doc, {
      startY: 26,
      head: [['Evento Contábil', 'Previsto DRE', 'Em Aberto', 'Pagas c/ Prevista', 'Suspeitas À Vista', 'Diferença']],
      body,
      foot: [[
        'TOTAL',
        formatCurrency(totals.previstoDRE),
        formatCurrency(totals.emAberto),
        formatCurrency(totals.pagasComPrevista),
        formatCurrency(totals.suspeitasAVista),
        formatCurrency(totals.previstoDRE - totals.emAberto - totals.pagasComPrevista),
      ]],
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: [30, 41, 59], halign: 'center' },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
    });

    doc.save(`conciliacao-dre-${startDate}_${endDate}.pdf`);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) clearSelection(); onOpenChange(v); }}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
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
            <li><strong>Previsto DRE</strong>: tudo com data prevista no período (pagas + em aberto).</li>
            <li><strong>Em Aberto</strong>: parcela ainda não liquidada — é o que aparece em Pagar/Receber.</li>
            <li><strong>Pagas c/ Prevista</strong>: já liquidadas, mas continuam compondo o Previsto da DRE.</li>
            <li><strong>Suspeitas À Vista</strong>: pagas em que <em>Data Prevista = Data de Pagamento</em> — provável lançamento À Vista antigo com Data Prevista preenchida indevidamente.</li>
            <li><strong>Diferença</strong>: deve ser zero. Se não for, indica banco invisível ou categoria fora da DRE.</li>
          </ul>
        </div>

        {selected.size > 0 && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 mb-2">
            <span className="text-sm font-medium">{selected.size} transação(ões) selecionada(s)</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={clearSelection}>Limpar seleção</Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar em massa
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setConfirmClearOpen(true)}>
                <Eraser className="h-3.5 w-3.5" /> Limpar Data Prevista
              </Button>
            </div>
          </div>
        )}

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
                <TableHead className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Suspeitas À Vista <AlertCircle className="h-3 w-3 text-amber-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Pagas onde Data Prevista = Data de Pagamento. Provável À Vista legado com data prevista preenchida indevidamente.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(g => {
                const diff = g.previstoDRE - (g.emAberto + g.pagasComPrevista);
                const isOpen = !!expanded[g.key];
                const allIds = g.txns.map(t => t.id);
                const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
                const hasSuspeitas = g.txns.some(isSuspectAVista);
                return (
                  <Fragment key={g.key}>
                    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => toggle(g.key)}>
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
                      <TableCell className={cn('text-right', g.suspeitasAVista > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground')}>
                        {formatCurrency(g.suspeitasAVista)}
                      </TableCell>
                      <TableCell className={cn('text-right font-semibold', Math.abs(diff) > 0.001 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                        {formatCurrency(diff)}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={g.key + '-detail'}>
                        <TableCell colSpan={7} className="bg-muted/20 p-0">
                          <div className="p-3 space-y-2">
                            {hasSuspeitas && (
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 h-7 text-xs border-amber-500/50 text-amber-700 dark:text-amber-400"
                                  onClick={(e) => { e.stopPropagation(); selectSuspeitas(g.txns); }}
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  Selecionar suspeitas À Vista
                                </Button>
                              </div>
                            )}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[32px]">
                                    <Checkbox
                                      checked={allSelected}
                                      onCheckedChange={(c) => selectGroup(allIds, !!c)}
                                      aria-label="Selecionar tudo"
                                    />
                                  </TableHead>
                                  <TableHead className="text-xs">Data Prevista</TableHead>
                                  <TableHead className="text-xs">Data Pagto.</TableHead>
                                  <TableHead className="text-xs">Cliente/Fornecedor</TableHead>
                                  <TableHead className="text-xs">Evento Contábil</TableHead>
                                  <TableHead className="text-xs">Conta Corrente</TableHead>
                                  <TableHead className="text-right text-xs">Valor</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {g.txns
                                  .slice()
                                  .sort((a, b) => (a.expected_date || '').localeCompare(b.expected_date || ''))
                                  .map(t => {
                                    const suspect = isSuspectAVista(t);
                                    return (
                                      <TableRow key={t.id} className={cn(suspect && 'bg-amber-500/5')}>
                                        <TableCell>
                                          <Checkbox
                                            checked={selected.has(t.id)}
                                            onCheckedChange={() => toggleSelected(t.id)}
                                          />
                                        </TableCell>
                                        <TableCell className="text-xs">{formatDateBR(t.expected_date)}</TableCell>
                                        <TableCell className="text-xs">{formatDateBR(t.date)}</TableCell>
                                        <TableCell className="text-xs">{contactName(t.contact_id)}</TableCell>
                                        <TableCell className="text-xs">{subEventName(t.category_id)}</TableCell>
                                        <TableCell className="text-xs">{bankName(t.bank_id)}</TableCell>
                                        <TableCell className="text-right text-xs">{formatCurrency(Number(t.amount))}</TableCell>
                                        <TableCell className="text-xs">
                                          <div className="flex flex-wrap items-center gap-1">
                                            {t.is_paid ? (
                                              <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600">Pago</Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">Em aberto</Badge>
                                            )}
                                            {suspect && (
                                              <Badge variant="outline" className="text-[10px] border-amber-500/60 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                                                Provável À Vista
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell></TableCell>
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.previstoDRE)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.emAberto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.pagasComPrevista)}</TableCell>
                <TableCell className={cn('text-right', totals.suspeitasAVista > 0 && 'text-amber-600 dark:text-amber-400')}>
                  {formatCurrency(totals.suspeitasAVista)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.previstoDRE - totals.emAberto - totals.pagasComPrevista)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar Data Prevista em {selected.size} transação(ões)?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                A Data Prevista será removida das transações selecionadas. Elas deixarão de aparecer no
                <strong> Previsto da DRE</strong> e continuarão compondo o <strong>Realizado</strong> normalmente.
              </p>
              {selectedTxns.length <= 10 ? (
                <ul className="text-xs list-disc pl-5 max-h-40 overflow-auto">
                  {selectedTxns.map(t => (
                    <li key={t.id}>{t.description} — {formatCurrency(Number(t.amount))}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs">Primeiras 10 de {selectedTxns.length}:</p>
              )}
              {selectedTxns.length > 10 && (
                <ul className="text-xs list-disc pl-5 max-h-40 overflow-auto">
                  {selectedTxns.slice(0, 10).map(t => (
                    <li key={t.id}>{t.description} — {formatCurrency(Number(t.amount))}</li>
                  ))}
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); handleClearExpected(); }} disabled={clearing}>
            {clearing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <BulkEditDialog
      open={bulkEditOpen}
      onOpenChange={setBulkEditOpen}
      selectedIds={Array.from(selected)}
      contacts={contacts.map(c => ({ id: c.id, name: c.name, is_active: c.is_active }))}
      categories={categories.map(c => ({ id: c.id, name: c.name, type: c.type }))}
      banks={banks.map(b => ({ id: b.id, name: b.name, is_active: b.is_active }))}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ['dre-conciliation'] });
        clearSelection();
      }}
    />
    </>
  );
}
