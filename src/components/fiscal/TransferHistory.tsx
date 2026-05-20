import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface TransferLogRow {
  id: string;
  contacts_count: number;
  transferred_at: string;
  reverted_at: string | null;
  from_profile: { full_name: string | null } | null;
  to_profile: { full_name: string | null } | null;
  transferred_by_profile: { full_name: string | null } | null;
}

export function TransferHistory() {
  const queryClient = useQueryClient();
  const [confirmRow, setConfirmRow] = useState<TransferLogRow | null>(null);
  const [reverting, setReverting] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['transfer-log'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('transfer_log')
        .select(`
          id,
          contacts_count,
          transferred_at,
          reverted_at,
          from_profile:from_profile_id ( full_name ),
          to_profile:to_profile_id ( full_name ),
          transferred_by_profile:transferred_by ( full_name )
        `)
        .order('transferred_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as TransferLogRow[];
    },
  });

  const handleRevert = async () => {
    if (!confirmRow) return;
    try {
      setReverting(true);
      const { data, error } = await (supabase as any).rpc('revert_transfer', {
        p_transfer_log_id: confirmRow.id,
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`✅ Transferência revertida. ${data.contacts_reverted} clientes devolvidos.`);
        queryClient.invalidateQueries({ queryKey: ['transfer-log'] });
        queryClient.invalidateQueries({ queryKey: ['collaborators-with-clients'] });
        queryClient.invalidateQueries({ queryKey: ['client-count-by-profile'] });
        queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['fiscal-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['company-profiles-fiscal-with-clients'] });
        setConfirmRow(null);
      } else {
        toast.error(data?.error || 'Erro ao reverter transferência');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao reverter transferência');
    } finally {
      setReverting(false);
    }
  };

  return (
    <section>
      <Accordion type="single" collapsible>
        <AccordionItem value="history" className="border border-border/50 rounded-lg bg-card px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Histórico de Transferências (últimas 20)
          </AccordionTrigger>
          <AccordionContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Carregando...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma transferência realizada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>De</TableHead>
                      <TableHead>Para</TableHead>
                      <TableHead className="text-right">Clientes</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Feito por</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const active = !log.reverted_at;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.from_profile?.full_name ?? '—'}</TableCell>
                          <TableCell className="font-medium">{log.to_profile?.full_name ?? '—'}</TableCell>
                          <TableCell className="text-right">{log.contacts_count}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.transferred_at
                              ? format(parseISO(log.transferred_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.transferred_by_profile?.full_name ?? '—'}
                          </TableCell>
                          <TableCell>
                            {active ? (
                              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                                Revertida
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {active && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setConfirmRow(log)}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reverter
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter transferência?</AlertDialogTitle>
            <AlertDialogDescription>
              Reverter esta transferência devolverá {confirmRow?.contacts_count ?? 0} clientes para{' '}
              {confirmRow?.from_profile?.full_name ?? '—'}. As tarefas já concluídas não serão revertidas. Confirmar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={reverting}>
              {reverting ? 'Revertendo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
