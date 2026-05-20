import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CalendarRange, CheckCircle2, Info, Loader2, Pencil, Plus, Rocket, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useFiscalCalendar,
  useCalculateCalendar,
  useConfirmMonthlyTasks,
  FiscalCalendarEffectiveRow,
} from '@/hooks/useFiscalCalendar';
import { FiscalObligationOverrideDialog } from '@/components/fiscal/FiscalObligationOverrideDialog';
import { BulkEditCalendarDialog } from '@/components/fiscal/BulkEditCalendarDialog';
import { CustomObligationDialog, CustomObligationInitial } from '@/components/fiscal/CustomObligationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const YEARS = [2025, 2026, 2027];

type Phase = 'idle' | 'calculated' | 'launched';
const phaseKey = (y: number, m: number) => `fiscal-calendar-phase:${y}-${m}`;

export default function FiscalCalendar() {
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const qc = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [phase, setPhase] = useState<Phase>('idle');
  const { data: rows, isLoading } = useFiscalCalendar(year, month, phase !== 'idle');
  const calculate = useCalculateCalendar();
  const confirm = useConfirmMonthlyTasks();

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(phaseKey(year, month));
      setPhase((stored as Phase) ?? 'idle');
    } catch {
      setPhase('idle');
    }
  }, [year, month]);

  const setPhasePersist = (next: Phase) => {
    setPhase(next);
    try {
      sessionStorage.setItem(phaseKey(year, month), next);
    } catch {}
  };

  const handleMonthChange = (v: string) => {
    setPhasePersist('idle');
    setMonth(Number(v));
    setSelected(new Set());
  };
  const handleYearChange = (v: string) => {
    setPhasePersist('idle');
    setYear(Number(v));
    setSelected(new Set());
  };

  const [editing, setEditing] = useState<FiscalCalendarEffectiveRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastIdx, setLastIdx] = useState<number | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<FiscalCalendarEffectiveRow | null>(null);

  // custom obligation dialog
  const [customOpen, setCustomOpen] = useState(false);
  const [customInitial, setCustomInitial] = useState<CustomObligationInitial | null>(null);
  const [obligationToDelete, setObligationToDelete] = useState<{ id: string; name: string } | null>(null);

  const sorted = useMemo(() => rows ?? [], [rows]);

  // Reset selection when rows change set
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(sorted.map((r) => r.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }, [sorted]);

  if (roleLoading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/fiscal/tarefas" replace />;

  const fmt = (s: string | null) => (s ? format(parseISO(s), 'dd/MM/yyyy') : '—');

  const handleCalculate = () => {
    calculate.mutate({ year, month }, { onSuccess: () => setPhasePersist('calculated') });
  };
  const handleConfirm = () => {
    confirm.mutate({ year, month }, { onSuccess: () => setPhasePersist('launched') });
  };

  const allChecked = sorted.length > 0 && selected.size === sorted.length;
  const someChecked = selected.size > 0 && selected.size < sorted.length;

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
      setLastIdx(null);
    } else {
      setSelected(new Set(sorted.map((r) => r.id)));
    }
  };

  const handleRowCheckbox = (idx: number, e: React.MouseEvent) => {
    const id = sorted[idx].id;
    const next = new Set(selected);
    if (e.shiftKey && lastIdx !== null) {
      const [s, eIdx] = lastIdx < idx ? [lastIdx, idx] : [idx, lastIdx];
      for (let i = s; i <= eIdx; i++) next.add(sorted[i].id);
    } else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
    setSelected(next);
    setLastIdx(idx);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    try {
      const { error } = await (supabase as any)
        .from('fiscal_calendar')
        .delete()
        .in('id', ids);
      if (error) throw error;
      toast.success(`✅ ${ids.length} entrada(s) excluída(s).`);
      setSelected(new Set());
      setLastIdx(null);
      qc.invalidateQueries({ queryKey: ['fiscal-calendar'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao excluir');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const handleDeleteRow = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('fiscal_calendar').delete().eq('id', id);
      if (error) throw error;
      toast.success('✅ Obrigação removida do calendário.');
      qc.invalidateQueries({ queryKey: ['fiscal-calendar'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao excluir');
    } finally {
      setRowToDelete(null);
    }
  };

  const COL_COUNT = 7;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Calendário Fiscal</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => { setCustomInitial(null); setCustomOpen(true); }}
          >
            <Plus className="h-4 w-4" /> Nova Obrigação
          </Button>



          {phase === 'idle' && (
            <Button onClick={handleCalculate} disabled={calculate.isPending}>
              {calculate.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Calculando...</>
              ) : (
                <><Zap className="h-4 w-4" /> Calcular Calendário</>
              )}
            </Button>
          )}

          {phase === 'calculated' && (
            <Button onClick={handleConfirm} disabled={confirm.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {confirm.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Lançando...</>
              ) : (
                <><Rocket className="h-4 w-4" /> Confirmar e Lançar Tarefas</>
              )}
            </Button>
          )}

          {phase === 'launched' && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Tarefas lançadas
            </Badge>
          )}
        </div>
      </div>

      {phase === 'calculated' && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm">
          <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-foreground">
            Calendário calculado. Revise as datas abaixo e clique em <strong>Confirmar e Lançar Tarefas</strong> para criar as tarefas no Kanban.
          </p>
        </div>
      )}

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 shadow-sm">
          <span className="text-sm font-medium">
            {selected.size} obrigação(ões) selecionada(s)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Editar selecionados
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Excluir selecionados
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(new Set()); setLastIdx(null); }}>
              <X className="h-4 w-4" /> Desmarcar tudo
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Obrigação</TableHead>
              <TableHead>Regime</TableHead>
              <TableHead>Vencimento Fiscal</TableHead>
              <TableHead>Entrega Interna</TableHead>
              <TableHead>Override</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {phase === 'idle' ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <CalendarRange className="h-10 w-10 opacity-40" />
                    <p>Clique em <strong>Calcular Calendário</strong> para visualizar as obrigações do período.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COL_COUNT }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-10 text-muted-foreground">
                  Nenhuma obrigação encontrada para o período
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r, idx) => {
                const cat = r.fiscal_obligations_catalog;
                const isOverridden = !!r.adjusted_due_date_override;
                const isChecked = selected.has(r.id);
                const isCustom = !!cat?.is_custom;
                return (
                  <TableRow key={r.id} data-state={isChecked ? 'selected' : undefined}>
                    <TableCell>
                      <div onClick={(e) => handleRowCheckbox(idx, e)} className="inline-flex">
                        <Checkbox checked={isChecked} aria-label="Selecionar linha" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{cat?.name ?? '—'}</span>
                        {isCustom && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0"
                          >
                            <Sparkles className="h-3 w-3" /> Personalizada
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(cat?.applies_to ?? []).map((t) => (
                          <Badge key={t} variant="outline">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{fmt(r.adjusted_due_date)}</TableCell>
                    <TableCell>{fmt(r.internal_delivery_date)}</TableCell>
                    <TableCell>
                      {isOverridden ? (
                        <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30">
                          Ajustado
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-500/30">
                          Automático
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditing(r); setDialogOpen(true); }}
                          title="Editar override"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isCustom && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCustomInitial({
                                  id: cat!.id,
                                  name: cat!.name,
                                  description: cat!.description ?? '',
                                  applies_to: cat!.applies_to ?? [],
                                  due_rule: cat!.due_rule ?? null,
                                  holiday_adjustment: cat!.holiday_adjustment ?? 'prev_business_day',
                                });
                                setCustomOpen(true);
                              }}
                              title="Editar obrigação personalizada"
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setObligationToDelete({ id: cat!.id, name: cat!.name })}
                              title="Excluir obrigação personalizada"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRowToDelete(r)}
                          title="Excluir entrada do mês"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <FiscalObligationOverrideDialog
        row={editing}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      />

      <BulkEditCalendarDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedIds={Array.from(selected)}
        onDone={() => { setSelected(new Set()); setLastIdx(null); }}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} entrada(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selected.size} entrada(s) do calendário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rowToDelete} onOpenChange={(o) => !o && setRowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada</AlertDialogTitle>
            <AlertDialogDescription>
              {rowToDelete && (
                <>Excluir a entrada "{rowToDelete.fiscal_obligations_catalog?.name ?? '—'}" do calendário de {String(month).padStart(2, '0')}/{year}?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rowToDelete && handleDeleteRow(rowToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomObligationDialog
        open={customOpen}
        onOpenChange={(o) => { setCustomOpen(o); if (!o) setCustomInitial(null); }}
        initial={customInitial}
      />

      <AlertDialog open={!!obligationToDelete} onOpenChange={(o) => !o && setObligationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir obrigação personalizada</AlertDialogTitle>
            <AlertDialogDescription>
              {obligationToDelete && (
                <>Excluir definitivamente a obrigação personalizada "{obligationToDelete.name}"? Esta ação removerá a obrigação de todos os meses e contatos vinculados.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!obligationToDelete) return;
                try {
                  const { error } = await (supabase as any)
                    .from('fiscal_obligations_catalog')
                    .delete()
                    .eq('id', obligationToDelete.id)
                    .eq('is_custom', true);
                  if (error) throw error;
                  toast.success('✅ Obrigação personalizada excluída.');
                  qc.invalidateQueries({ queryKey: ['fiscal-calendar'] });
                  qc.invalidateQueries({ queryKey: ['fiscal-obligations-catalog'] });
                } catch (e: any) {
                  toast.error(e?.message ?? 'Erro ao excluir');
                } finally {
                  setObligationToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
