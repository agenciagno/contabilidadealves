import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FiscalTask } from '@/hooks/useFiscalTasks';

interface TaskCardProps {
  task: FiscalTask;
  contactName: string;
  responsibleName: string;
  responsibleInitials: string;
  onClick: () => void;
  dragProps?: Record<string, any>;
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

export function TaskCard({ task, contactName, responsibleName, responsibleInitials, onClick, dragProps }: TaskCardProps) {
  const dateColor = getDueDateColor(task.due_date);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border/50 bg-card"
      onClick={onClick}
      {...dragProps}
    >
      <CardContent className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground truncate">{contactName}</p>
        <p className="text-sm font-medium text-foreground line-clamp-2">{task.title}</p>

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
  );
}
