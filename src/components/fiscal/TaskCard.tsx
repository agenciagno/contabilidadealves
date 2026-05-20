import { useState } from 'react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Paperclip, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { FiscalTask } from '@/hooks/useFiscalTasks';

interface TaskCardProps {
  task: FiscalTask;
  contactName: string;
  responsibleName: string;
  responsibleInitials: string;
  onClick: () => void;
  dragProps?: Record<string, any>;
  onEdit?: (task: FiscalTask) => void;
  onDelete?: (taskId: string) => void;
}

function getDueDateColor(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseISO(dueDate);
  const daysLeft = differenceInDays(due, today);

  if (daysLeft < 0) return { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', label: 'Vencido' };
  if (daysLeft <= 2) return { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30', label: `${daysLeft}d` };
  if (daysLeft <= 6) return { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30', label: `${daysLeft}d` };
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30', label: `${daysLeft}d` };
}

export function TaskCard({ task, contactName, responsibleName, responsibleInitials, onClick, dragProps, onEdit, onDelete }: TaskCardProps) {
  const dateColor = getDueDateColor(task.due_date);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stopAll = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-border/50 bg-card relative"
        onClick={onClick}
        {...dragProps}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground truncate">{contactName}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{task.title}</p>
            </div>
            {(onEdit || onDelete) && (
              <div
                onPointerDown={stopAll}
                onMouseDown={stopAll}
                onClick={stopAll}
                className="-mr-1 -mt-1"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
                      aria-label="Ações"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={stopAll}>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', dateColor.bg, dateColor.text, dateColor.border)}>
              <Calendar className="w-3 h-3 mr-1" />
              {format(parseISO(task.due_date), 'dd/MM', { locale: ptBR })}
            </Badge>

            <div className="flex items-center gap-1.5">
              {task.attachment_url && (
                <Paperclip className="w-3 h-3 text-muted-foreground" />
              )}
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {responsibleInitials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={stopAll}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDelete?.(task.id); setConfirmOpen(false); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
