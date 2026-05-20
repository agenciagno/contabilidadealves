import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { FiscalTask } from '@/hooks/useFiscalTasks';
import { TaskCard } from './TaskCard';
import { useToast } from '@/hooks/use-toast';

const COLUMNS = [
  { id: 'a_fazer', label: 'A Fazer', color: 'bg-blue-500' },
  { id: 'em_progresso', label: 'Em Progresso', color: 'bg-orange-500' },
  { id: 'aguardando_cliente', label: 'Aguardando Cliente', color: 'bg-yellow-500' },
  { id: 'concluido', label: 'Concluído', color: 'bg-emerald-500' },
] as const;

const COLUMN_IDS = COLUMNS.map((c) => c.id) as readonly string[];

type SortDir = 'asc' | 'desc';

interface KanbanBoardProps {
  tasks: FiscalTask[];
  contactsMap: Record<string, string>;
  profilesMap: Record<string, { name: string; initials: string }>;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onTaskClick: (task: FiscalTask) => void;
  onEdit?: (task: FiscalTask) => void;
  onDelete?: (taskId: string) => void;
}

function DroppableColumn({
  id, label, color, count, sortDir, onToggleSort, children,
}: {
  id: string;
  label: string;
  color: string;
  count: number;
  sortDir: SortDir;
  onToggleSort: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[260px] flex-shrink-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
        <button
          type="button"
          onClick={onToggleSort}
          title={sortDir === 'desc' ? 'Mais recente primeiro' : 'Mais antigo primeiro'}
          className="ml-auto h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          aria-label="Alternar ordenação"
        >
          {sortDir === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
        </button>
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

function SortableTaskCard({ task, contactsMap, profilesMap, onTaskClick, onEdit, onDelete }: {
  task: FiscalTask;
  contactsMap: Record<string, string>;
  profilesMap: Record<string, { name: string; initials: string }>;
  onTaskClick: (task: FiscalTask) => void;
  onEdit?: (task: FiscalTask) => void;
  onDelete?: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const profile = profilesMap[task.responsible_id || ''] || { name: 'Sem responsável', initials: '?' };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        contactName={contactsMap[task.contact_id] || 'Cliente'}
        responsibleName={profile.name}
        responsibleInitials={profile.initials}
        onClick={() => onTaskClick(task)}
        dragProps={{ ...attributes, ...listeners }}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

export function KanbanBoard({ tasks, contactsMap, profilesMap, onStatusChange, onTaskClick, onEdit, onDelete }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columnSort, setColumnSort] = useState<Record<string, SortDir>>(() =>
    COLUMNS.reduce((acc, c) => ({ ...acc, [c.id]: 'desc' as SortDir }), {}),
  );
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tasksByStatus = useMemo(() => {
    return COLUMNS.reduce((acc, col) => {
      const dir = columnSort[col.id];
      const list = tasks
        .filter((t) => t.status === col.id)
        .slice()
        .sort((a, b) => {
          const cmp = a.due_date.localeCompare(b.due_date);
          return dir === 'asc' ? cmp : -cmp;
        });
      acc[col.id] = list;
      return acc;
    }, {} as Record<string, FiscalTask[]>);
  }, [tasks, columnSort]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // Collision detection that prioritizes column droppables so empty/distant columns are reachable
  const collisionDetection: CollisionDetection = (args) => {
    const columnContainers = args.droppableContainers.filter((c) =>
      COLUMN_IDS.includes(String(c.id)),
    );
    const pointer = pointerWithin({ ...args, droppableContainers: columnContainers });
    if (pointer.length > 0) return pointer;
    const rect = rectIntersection({ ...args, droppableContainers: columnContainers });
    if (rect.length > 0) return rect;
    return closestCenter({ ...args, droppableContainers: columnContainers });
  };

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

    const targetStatus = String(over.id);
    if (!COLUMN_IDS.includes(targetStatus)) return;
    if (targetStatus === task.status) return;

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

  const toggleColumnSort = (id: string) =>
    setColumnSort((prev) => ({ ...prev, [id]: prev[id] === 'desc' ? 'asc' : 'desc' }));

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kanban-scroll-container has-scroll">
        <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <DroppableColumn
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
            count={tasksByStatus[col.id].length}
            sortDir={columnSort[col.id]}
            onToggleSort={() => toggleColumnSort(col.id)}
          >
            <SortableContext items={tasksByStatus[col.id].map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasksByStatus[col.id].map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  contactsMap={contactsMap}
                  profilesMap={profilesMap}
                  onTaskClick={onTaskClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
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
