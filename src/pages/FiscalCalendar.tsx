import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Loader2, Pencil, Zap } from 'lucide-react';
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
  useGenerateMonthlyTasks,
  FiscalCalendarEffectiveRow,
} from '@/hooks/useFiscalCalendar';
import { FiscalObligationOverrideDialog } from '@/components/fiscal/FiscalObligationOverrideDialog';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const YEARS = [2025, 2026, 2027];

export default function FiscalCalendar() {
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const { data: rows, isLoading } = useFiscalCalendar(year, month);
  const generate = useGenerateMonthlyTasks();

  const [editing, setEditing] = useState<FiscalCalendarEffectiveRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sorted = useMemo(() => rows ?? [], [rows]);

  if (roleLoading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/fiscal/tarefas" replace />;

  const fmt = (s: string | null) => (s ? format(parseISO(s), 'dd/MM/yyyy') : '—');

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Calendário Fiscal</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => generate.mutate({ year, month })}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
            ) : (
              <><Zap className="h-4 w-4" /> Gerar Tarefas do Mês</>
            )}
          </Button>
        </div>
      </div>

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
            {isLoading ? (
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
