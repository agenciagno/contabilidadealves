import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Eye, Trash2, Paperclip } from 'lucide-react';
import { FiscalTask } from '@/hooks/useFiscalTasks';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  a_fazer: { label: 'A Fazer', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  aguardando_cliente: { label: 'Aguardando', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  em_progresso: { label: 'Em Progresso', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  concluido: { label: 'Concluído', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
};

function getDueDateColor(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = differenceInDays(parseISO(dueDate), today);
  if (daysLeft < 0) return 'text-destructive';
  if (daysLeft <= 2) return 'text-orange-600';
  if (daysLeft <= 6) return 'text-yellow-600';
  return 'text-emerald-600';
}

interface TaskListViewProps {
  tasks: FiscalTask[];
  contactsMap: Record<string, string>;
  profilesMap: Record<string, { name: string; initials: string }>;
  onTaskClick: (task: FiscalTask) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export function TaskListView({ tasks, contactsMap, profilesMap, onTaskClick, onDelete, canDelete }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <div className="text-muted-foreground text-center py-16">Nenhuma tarefa encontrada</div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Obrigação</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
            <TableHead className="text-right w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => {
            const profile = profilesMap[task.responsible_id || ''] || { name: '—', initials: '?' };
            const statusInfo = STATUS_LABELS[task.status] || STATUS_LABELS.a_fazer;
            return (
              <TableRow key={task.id} className="cursor-pointer" onClick={() => onTaskClick(task)}>
                <TableCell className="font-medium text-sm">{contactsMap[task.contact_id] || '—'}</TableCell>
                <TableCell className="text-sm">{task.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{profile.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{profile.name}</span>
                  </div>
                </TableCell>
                <TableCell className={cn('text-sm font-medium', getDueDateColor(task.due_date))}>
                  {format(parseISO(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>{statusInfo.label}</Badge>
                </TableCell>
                <TableCell>
                  {task.attachment_url && <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />}
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => onTaskClick(task)}><Eye className="h-4 w-4" /></Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
