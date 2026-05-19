import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCollaborators, useCoverages, usePendingTasksByProfile } from '@/hooks/useCollaboratorCoverage';
import { CoverageCreateModal } from '@/components/fiscal/CoverageCreateModal';

const REASON_LABELS: Record<string, string> = {
  ferias: 'Férias',
  licenca_medica: 'Licença médica',
  licenca_maternidade: 'Licença maternidade',
  outros: 'Outros',
};

export default function FiscalCollaborators() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { user } = useAuth();
  const { company } = useCompany();
  const companyId = company?.id;

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      navigate('/fiscal/tarefas', { replace: true });
    }
  }, [isAdmin, isSuperAdmin, navigate]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: collaborators = [] } = useCollaborators();
  const { coverages, createCoverage, endCoverage } = useCoverages();
  const { data: pendingMap = {} } = usePendingTasksByProfile(year, month);

  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile-id', user?.id, companyId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const [modalOpen, setModalOpen] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const statusByProfile = useMemo(() => {
    const map: Record<string, { kind: 'active' | 'on_leave' | 'covering'; label: string }> = {};
    coverages.forEach((c) => {
      if (!c.is_active) return;
      if (c.start_date > today) return; // future scheduled
      if (c.end_date && c.end_date < today) return;
      // absent → on_leave
      map[c.absent_profile_id] = { kind: 'on_leave', label: 'Em férias' };
      const coveringName = collaborators.find((cl) => cl.id === c.absent_profile_id)?.full_name ?? '—';
      map[c.covering_profile_id] = { kind: 'covering', label: `Cobrindo ${coveringName}` };
    });
    return map;
  }, [coverages, collaborators, today]);

  const profileNameById = (id: string | null) => {
    if (!id) return '—';
    const p = collaborators.find((c) => c.id === id);
    return p?.full_name || p?.email || '—';
  };

  const coverageStatus = (c: { is_active: boolean; start_date: string; end_date: string | null }) => {
    if (!c.is_active) return { label: 'Encerrada', className: 'bg-muted text-muted-foreground border-border' };
    if (c.start_date > today) return { label: 'Agendada', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
    return { label: 'Ativa', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-4 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nova Cobertura
        </Button>
      </div>

      {/* Seção 1 — Colaboradores Ativos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Colaboradores Ativos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {collaborators.map((c) => {
            const status = statusByProfile[c.id] ?? { kind: 'active' as const, label: 'Ativo' };
            const name = c.full_name || c.email;
            const initials = (name || '?').substring(0, 2).toUpperCase();
            const pending = pendingMap[c.id] ?? 0;
            const badgeClass =
              status.kind === 'on_leave' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
              : status.kind === 'covering' ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
            return (
              <Card key={c.id} className="bg-card border-border/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <Badge variant="outline" className={`mt-1 text-[10px] ${badgeClass}`}>{status.label}</Badge>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {pending} tarefa{pending === 1 ? '' : 's'} pendente{pending === 1 ? '' : 's'} no mês
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {collaborators.length === 0 && (
            <div className="col-span-full text-muted-foreground text-sm">Nenhum colaborador ativo.</div>
          )}
        </div>
      </section>

      {/* Seção 2 — Coberturas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Coberturas Programadas / Ativas</h2>
        <Card className="bg-card border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador Ausente</TableHead>
                <TableHead>Coberto por</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coverages.map((c) => {
                const st = coverageStatus(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{profileNameById(c.absent_profile_id)}</TableCell>
                    <TableCell className="text-sm">{profileNameById(c.covering_profile_id)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(c.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {' — '}
                      {c.end_date ? format(parseISO(c.end_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Indefinido'}
                    </TableCell>
                    <TableCell className="text-sm">{REASON_LABELS[c.reason] ?? c.reason}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${st.className}`}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => endCoverage.mutate(c.id)}
                        >
                          Encerrar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {coverages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma cobertura cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <CoverageCreateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        collaborators={collaborators}
        currentProfileId={currentProfile ?? null}
        onConfirm={(input) => createCoverage.mutateAsync(input)}
      />
    </div>
  );
}
