import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRightLeft, UserCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUserRole } from '@/hooks/useUserRole';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import {
  useCollaborators,
  useAllFiscalProfiles,
  useClientCountByProfile,
  useCollaboratorDetails,
} from '@/hooks/useCollaboratorCoverage';
import { TransferClientsModal } from '@/components/fiscal/TransferClientsModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_BADGE: Record<string, string> = {
  a_fazer: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  em_progresso: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  aguardando_cliente: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  concluido: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};
const STATUS_LABEL: Record<string, string> = {
  a_fazer: 'A Fazer',
  em_progresso: 'Em Progresso',
  aguardando_cliente: 'Aguardando',
  concluido: 'Concluído',
};

function CollaboratorDetailPanel({ profileId, onSeeAll }: { profileId: string; onSeeAll: () => void }) {
  const now = new Date();
  const { data, isLoading } = useCollaboratorDetails(profileId, now.getFullYear(), now.getMonth() + 1);
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;
  const total = data?.total ?? 0;
  const done = data?.done ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const upcoming = data?.upcoming ?? [];
  return (
    <div className="p-4 space-y-4 border-t border-border/40 bg-muted/20">
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progresso do mês</span>
          <span className="font-medium">{done} de {total} ({pct}%)</span>
        </div>
        <Progress value={pct} />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Próximas tarefas pendentes</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">
                  <span className="font-medium">{t.contacts?.name ?? '—'}</span>
                  <span className="text-muted-foreground"> · {t.fiscal_obligations_catalog?.name ?? t.title ?? '—'}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.due_date ? format(parseISO(t.due_date), 'dd/MM', { locale: ptBR }) : '—'}
                </span>
                <Badge variant="outline" className={cn('text-[10px]', STATUS_BADGE[t.status])}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onSeeAll}>Ver todas as tarefas</Button>
    </div>
  );
}

export default function FiscalCollaborators() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      navigate('/fiscal/tarefas', { replace: true });
    }
  }, [isAdmin, isSuperAdmin, navigate]);

  const now = new Date();

  const { data: collaborators = [] } = useCollaborators();
  const { data: allFiscalProfiles = [] } = useAllFiscalProfiles();
  const { data: clientCountMap = {} } = useClientCountByProfile();

  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleTransfer = async ({ fromId, toId, fromName, toName }: { fromId: string; toId: string; fromName: string; toName: string }) => {
    if (!companyId) return;
    try {
      const { data, error } = await (supabase as any).rpc('transfer_clients_with_log', {
        p_from_profile_id: fromId,
        p_to_profile_id: toId,
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`✅ ${data.contacts_transferred} clientes e ${data.tasks_transferred} tarefas transferidos de ${fromName} para ${toName}.`);
        queryClient.invalidateQueries({ queryKey: ['collaborators-with-clients'] });
        queryClient.invalidateQueries({ queryKey: ['client-count-by-profile'] });
        queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['fiscal-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['company-profiles-fiscal-with-clients'] });
        queryClient.invalidateQueries({ queryKey: ['transfer-log'] });
      } else {
        toast.error(data?.error || 'Erro ao transferir clientes');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao transferir.');
      throw e;
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-4 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <ArrowRightLeft className="w-4 h-4" />
          Transferir Clientes
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Colaboradores Ativos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {collaborators.map((c) => {
            const name = c.full_name || c.email;
            const initials = (name || '?').substring(0, 2).toUpperCase();
            const clientsCount = clientCountMap[c.id] ?? 0;
            const isExpanded = expandedId === c.id;
            return (
              <Card
                key={c.id}
                className={cn(
                  'bg-card border-border/50 overflow-hidden cursor-pointer transition-all hover:border-primary/30',
                  isExpanded && 'sm:col-span-2 lg:col-span-3 xl:col-span-4 border-primary/40'
                )}
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Ativo
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {clientsCount} cliente{clientsCount === 1 ? '' : 's'} vinculado{clientsCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                </CardContent>
                {isExpanded && (
                  <CollaboratorDetailPanel
                    profileId={c.id}
                    onSeeAll={() => navigate(`/fiscal/tarefas?responsible=${c.id}`)}
                  />
                )}
              </Card>
            );
          })}
          {collaborators.length === 0 && (
            <div className="col-span-full text-muted-foreground text-sm">Nenhum colaborador com clientes atribuídos.</div>
          )}
        </div>
      </section>

      <TransferClientsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sourceCollaborators={collaborators}
        destinationCollaborators={allFiscalProfiles}
        onConfirm={handleTransfer}
      />
    </div>
  );
}
