import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CalendarRange, CheckCircle2, Info, Loader2, Pencil, Rocket, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useUserRole } from '@/hooks/useUserRole';
import {
  useFiscalCalendar,
  useCalculateCalendar,
  useConfirmMonthlyTasks,
  FiscalCalendarEffectiveRow,
} from '@/hooks/useFiscalCalendar';
import { FiscalObligationOverrideDialog } from '@/components/fiscal/FiscalObligationOverrideDialog';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const YEARS = [2025, 2026, 2027];

type Phase = 'idle' | 'calculated' | 'launched';
const phaseKey = (y: number, m: number) => `fiscal-calendar-phase:${y}-${m}`;

export default function FiscalCalendar() {
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();

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

  // Reset phase to idle on period change (clears table)
  const handleMonthChange = (v: string) => {
    setPhasePersist('idle');
    setMonth(Number(v));
  };
  const handleYearChange = (v: string) => {
    setPhasePersist('idle');
    setYear(Number(v));
  };

  const [editing, setEditing] = useState<FiscalCalendarEffectiveRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sorted = useMemo(() => rows ?? [], [rows]);

  if (roleLoading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/fiscal/tarefas" replace />;

  const fmt = (s: string | null) => (s ? format(parseISO(s), 'dd/MM/yyyy') : '—');

  const handleCalculate = () => {
    calculate.mutate({ year, month }, { onSuccess: () => setPhasePersist('calculated') });
  };
  const handleConfirm = () => {
    confirm.mutate({ year, month }, { onSuccess: () => setPhasePersist('launched') });
  };

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

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obrigação</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Regime</TableHead>
              <TableHead>Vencimento Fiscal</TableHead>
              <TableHead>Entrega Interna</TableHead>
              <TableHead>Override</TableHead>
              <TableHead className="w-12 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {phase === 'idle' ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <CalendarRange className="h-10 w-10 opacity-40" />
                    <p>Clique em <strong>Calcular Calendário</strong> para visualizar as obrigações do período.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhuma obrigação encontrada para o período
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => {
                const cat = r.fiscal_obligations_catalog;
                const isOverridden = !!r.adjusted_due_date_override;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{cat?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cat?.code ?? '—'}</Badge>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditing(r); setDialogOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
