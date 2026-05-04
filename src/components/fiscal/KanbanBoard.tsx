import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiscalTask } from '@/hooks/useFiscalTasks';
import { TaskCard } from './TaskCard';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const COLUMNS = [
  { id: 'a_fazer', label: 'A Fazer', color: 'bg-blue-500' },
  { id: 'aguardando_cliente', label: 'Aguardando Cliente', color: 'bg-yellow-500' },
  { id: 'em_progresso', label: 'Em Progresso', color: 'bg-orange-500' },
  { id: 'concluido', label: 'Concluído', color: 'bg-emerald-500' },
] as const;

interface KanbanBoardProps {
  tasks: FiscalTask[];
  contactsMap: Record<string, string>;
  profilesMap: Record<string, { name: string; initials: string }>;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onTaskClick: (task: FiscalTask) => void;
}

function DroppableColumn({ id, label, color, children, count }: { id: string; label: string; color: string; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[260px] flex-shrink-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg p-2 space-y-2 min-h-[200px] transition-colors ${
          isOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : 'bg-muted/30 border border-border/30'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function SortableTaskCard({ task, contactsMap, profilesMap, onTaskClick }: {
  task: FiscalTask;
  contactsMap: Record<string, string>;
  profilesMap: Record<string, { name: string; initials: string }>;
  onTaskClick: (task: FiscalTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const profile = profilesMap[task.responsible_id || ''] || { name: 'Sem responsável', initials: '?' };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        contactName={contactsMap[task.contact_id] || 'Cliente'}
        responsibleName={profile.name}
        responsibleInitials={profile.initials}
        onClick={() => onTaskClick(task)}
      />
    </div>
  );
}

export function KanbanBoard({ tasks, contactsMap, profilesMap, onStatusChange, onTaskClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {} as Record<string, FiscalTask[]>);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Determine the target column
    let targetStatus = over.id as string;

    // If dropped on another task, find which column it belongs to
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      targetStatus = overTask.status;
    }

    if (targetStatus === task.status) return;

    // Validate: can't move to concluido without attachment
    if (targetStatus === 'concluido' && !task.attachment_url) {
      toast({
        title: 'Anexo obrigatório',
        description: 'É necessário anexar um arquivo antes de concluir a tarefa.',
        variant: 'destructive',
      });
      return;
    }

    onStatusChange(taskId, targetStatus);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kanban-scroll-container has-scroll">
        <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <DroppableColumn key={col.id} id={col.id} label={col.label} color={col.color} count={tasksByStatus[col.id].length}>
            <SortableContext items={tasksByStatus[col.id].map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasksByStatus[col.id].map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  contactsMap={contactsMap}
                  profilesMap={profilesMap}
                  onTaskClick={onTaskClick}
                />
              ))}
            </SortableContext>
          </DroppableColumn>
        ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            contactName={contactsMap[activeTask.contact_id] || 'Cliente'}
            responsibleName={profilesMap[activeTask.responsible_id || '']?.name || '?'}
            responsibleInitials={profilesMap[activeTask.responsible_id || '']?.initials || '?'}
            onClick={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
