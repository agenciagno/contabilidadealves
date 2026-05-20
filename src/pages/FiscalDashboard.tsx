import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import {
  exportProductivity,
  exportCompliance,
  exportCriticalDueDates,
  exportExecutive,
  ExportTask,
} from '@/lib/fiscal-exports';
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
import { cn } from '@/lib/utils';

import { useUserRole } from '@/hooks/useUserRole';
import {
  useFiscalTasksOfMonth,
  useFiscalCollaborators,
  useUpcomingFiscalTasks,
  FiscalTaskRow,
} from '@/hooks/useFiscalDashboard';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const YEARS = [2025, 2026, 2027];

const COLOR_OK = 'hsl(142 71% 45%)';
const COLOR_PENDING = 'hsl(48 96% 53%)';
const COLOR_LATE = 'hsl(0 84% 60%)';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isLateTask = (t: { status: string; due_date: string | null }, today: string) =>
  t.status !== 'concluido' && !!t.due_date && t.due_date < today;

function KpiCard({
  label,
  value,
  total,
  icon: Icon,
  borderClass,
  iconClass,
}: {
  label: string;
  value: number;
  total: number;
  icon: typeof ListChecks;
  borderClass: string;
  iconClass: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card className={cn('border-l-4', borderClass)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{pct}% do total</p>
          </div>
          <Icon className={cn('h-5 w-5', iconClass)} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, isLate }: { status: string; isLate: boolean }) {
  if (isLate) {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/20">
        Atrasado
      </Badge>
    );
  }
  if (status === 'em_andamento') {
    return (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20">
        Em andamento
      </Badge>
    );
  }
  if (status === 'pendente') {
    return (
      <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20">
        Pendente
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

export default function FiscalDashboard() {
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const qc = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const tasksQ = useFiscalTasksOfMonth(year, month);
  const collabsQ = useFiscalCollaborators();
  const upcomingQ = useUpcomingFiscalTasks();

  const today = todayIso();

  const kpis = useMemo(() => {
    const tasks = tasksQ.data ?? [];
    const total = tasks.length;
    const concluidas = tasks.filter((t) => t.status === 'concluido').length;
    const pendentes = tasks.filter((t) => t.status === 'pendente').length;
    const atrasadas = tasks.filter((t) => isLateTask(t, today)).length;
    return { total, concluidas, pendentes, atrasadas };
  }, [tasksQ.data, today]);

  const chartData = useMemo(() => {
    const tasks = tasksQ.data ?? [];
    const collabs = collabsQ.data ?? [];
    const map = new Map<string, { name: string; concluidas: number; pendentes: number; atrasadas: number }>();
    collabs.forEach((c) => {
      map.set(c.id, { name: c.full_name ?? '—', concluidas: 0, pendentes: 0, atrasadas: 0 });
    });
    map.set('__none__', { name: 'Sem responsável', concluidas: 0, pendentes: 0, atrasadas: 0 });

    tasks.forEach((t: FiscalTaskRow) => {
      const key = t.responsible_id ?? '__none__';
      const entry = map.get(key);
      if (!entry) return;
      if (isLateTask(t, today)) entry.atrasadas += 1;
      else if (t.status === 'concluido') entry.concluidas += 1;
      else if (t.status === 'pendente') entry.pendentes += 1;
    });

    return Array.from(map.values()).filter(
      (e) => e.concluidas + e.pendentes + e.atrasadas > 0 || e.name !== 'Sem responsável'
    );
  }, [tasksQ.data, collabsQ.data, today]);

  const progressList = useMemo(() => {
    const tasks = tasksQ.data ?? [];
    const collabs = collabsQ.data ?? [];
    return collabs.map((c) => {
      const own = tasks.filter((t) => t.responsible_id === c.id);
      const total = own.length;
      const concluidas = own.filter((t) => t.status === 'concluido').length;
      const atrasadas = own.filter((t) => isLateTask(t, today)).length;
      const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
      return { id: c.id, name: c.full_name ?? '—', total, concluidas, atrasadas, pct };
    });
  }, [tasksQ.data, collabsQ.data, today]);

  if (roleLoading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/fiscal/tarefas" replace />;

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['fiscal-dashboard'] });
  };

  const { company } = useCompany();
  const companyId = (company as any)?.id;

  const fetchExportData = async (): Promise<{ tasks: ExportTask[]; contacts: any[]; profiles: any[] }> => {
    const [{ data: tasks }, { data: contacts }, { data: profiles }] = await Promise.all([
      (supabase as any)
        .from('fiscal_tasks')
        .select('id, status, due_date, fiscal_due_date, responsible_id, contact_id, title, fiscal_obligations_catalog(name)')
        .eq('company_id', companyId)
        .eq('competence_year', year)
        .eq('competence_month', month),
      supabase.from('contacts').select('id, name, document').eq('company_id', companyId),
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', companyId)
        .eq('status_active', true)
        .or('role.in.(admin,super_admin,colaborador),allowed_modules.cs.{fiscal}'),
    ]);
    const mappedTasks: ExportTask[] = (tasks ?? []).map((t: any) => ({
      ...t,
      obligation_name: t.fiscal_obligations_catalog?.name ?? null,
    }));
    return { tasks: mappedTasks, contacts: contacts ?? [], profiles: profiles ?? [] };
  };

  const handleExport = async (kind: 'productivity' | 'compliance' | 'critical' | 'executive') => {
    const { tasks, contacts, profiles } = await fetchExportData();
    if (kind === 'productivity') exportProductivity(tasks, profiles, year, month);
    if (kind === 'compliance') exportCompliance(tasks, contacts, profiles, year, month);
    if (kind === 'critical') exportCriticalDueDates(tasks, contacts, profiles, year, month);
    if (kind === 'executive') exportExecutive(tasks, contacts, profiles, year, month);
  };

  const fmt = (s: string | null) => (s ? format(parseISO(s), 'dd/MM/yyyy') : '—');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard Fiscal</h1>
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
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={() => handleExport('productivity')}>
                Produtividade da Equipe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('compliance')}>
                Compliance por Cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('critical')}>
                Vencimentos Críticos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('executive')}>
                Relatório Executivo do Mês
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total de Tarefas" value={kpis.total} total={kpis.total} icon={ListChecks} borderClass="border-l-blue-500" iconClass="text-blue-500" />
        <KpiCard label="Concluídas" value={kpis.concluidas} total={kpis.total} icon={CheckCircle2} borderClass="border-l-green-500" iconClass="text-green-500" />
        <KpiCard label="Pendentes" value={kpis.pendentes} total={kpis.total} icon={Clock} borderClass="border-l-yellow-500" iconClass="text-yellow-500" />
        <KpiCard label="Atrasadas" value={kpis.atrasadas} total={kpis.total} icon={AlertTriangle} borderClass="border-l-red-500" iconClass="text-red-500" />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarefas por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="concluidas" name="Concluídas" stackId="a" fill={COLOR_OK} radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill={COLOR_PENDING} />
                <Bar dataKey="atrasadas" name="Atrasadas" stackId="a" fill={COLOR_LATE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Progress per collaborator */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Progresso por Colaborador</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collabsQ.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))
          ) : progressList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum colaborador ativo.</p>
          ) : (
            progressList.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(c.name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate">{c.name}</span>
                    </div>
                    {c.atrasadas > 0 && (
                      <Badge variant="destructive">{c.atrasadas} atrasada(s)</Badge>
                    )}
                  </div>
                  <Progress value={c.pct} />
                  <p className="text-xs text-muted-foreground">
                    {c.concluidas} de {c.total} tarefas — {c.pct}%
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos Vencimentos (7 dias)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Obrigação</TableHead>
                <TableHead>Entrega Interna</TableHead>
                <TableHead>Vencimento Fiscal</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingQ.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (upcomingQ.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum vencimento nos próximos 7 dias
                  </TableCell>
                </TableRow>
              ) : (
                (upcomingQ.data ?? []).map((r) => {
                  const late = isLateTask({ status: r.status, due_date: r.due_date }, today);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.contacts?.name ?? '—'}</TableCell>
                      <TableCell>{r.fiscal_obligations_catalog?.name ?? r.title ?? '—'}</TableCell>
                      <TableCell>{fmt(r.due_date)}</TableCell>
                      <TableCell>{fmt(r.fiscal_due_date)}</TableCell>
                      <TableCell>{r.responsible?.full_name ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={r.status} isLate={late} /></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
