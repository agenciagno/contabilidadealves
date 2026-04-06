import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Kanban, List, CalendarDays, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useContacts } from '@/hooks/useContacts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useFiscalTasks, FiscalTask } from '@/hooks/useFiscalTasks';
import { KanbanBoard } from '@/components/fiscal/KanbanBoard';
import { TaskListView } from '@/components/fiscal/TaskListView';
import { TaskCalendarView } from '@/components/fiscal/TaskCalendarView';
import { TaskDetailModal } from '@/components/fiscal/TaskDetailModal';
import { TaskCreateModal } from '@/components/fiscal/TaskCreateModal';

type ViewMode = 'kanban' | 'list' | 'calendar';

export default function FiscalTasks() {
  const { companyId } = useCompany();
  const { isColaborador, isSuperAdmin, isAdmin } = useUserRole();
  const { contacts } = useContacts();

  // Filters
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterContact, setFilterContact] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterTitle, setFilterTitle] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<FiscalTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch company profiles for responsible dropdown
  const { data: companyProfiles = [] } = useQuery({
    queryKey: ['company-profiles', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', companyId!);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const filters = useMemo(() => ({
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    contactId: filterContact !== 'all' ? filterContact : undefined,
    responsibleId: filterResponsible !== 'all' ? filterResponsible : undefined,
    titleSearch: filterTitle || undefined,
  }), [startDate, endDate, filterContact, filterResponsible, filterTitle]);

  const { tasks, isLoading, createTask, updateTask, deleteTask } = useFiscalTasks(filters);

  const contactsMap = useMemo(() => {
    const map: Record<string, string> = {};
    contacts.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [contacts]);

  const profilesMap = useMemo(() => {
    const map: Record<string, { name: string; initials: string }> = {};
    companyProfiles.forEach(p => {
      const name = p.full_name || p.email?.split('@')[0] || '?';
      map[p.id] = { name, initials: name.substring(0, 2).toUpperCase() };
    });
    return map;
  }, [companyProfiles]);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTask.mutate({ id: taskId, status: newStatus as FiscalTask['status'] });
  };

  const handleTaskClick = (task: FiscalTask) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleCreate = (data: { contact_id: string; responsible_id: string | null; title: string; description: string | null; due_date: string }) => {
    if (!companyId) return;
    createTask.mutate({
      company_id: companyId,
      contact_id: data.contact_id,
      responsible_id: data.responsible_id,
      title: data.title,
      description: data.description,
      status: 'a_fazer',
      due_date: data.due_date,
      attachment_url: null,
      notes: null,
    });
  };

  const canDelete = isSuperAdmin || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tarefas Fiscais</h1>
        {canDelete && (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('gap-2 h-9', startDate && 'text-foreground')}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {startDate ? format(startDate, 'dd/MM/yy', { locale: ptBR }) : 'Início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground text-sm">até</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('gap-2 h-9', endDate && 'text-foreground')}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {endDate ? format(endDate, 'dd/MM/yy', { locale: ptBR }) : 'Fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Client Filter */}
        <Select value={filterContact} onValueChange={setFilterContact}>
          <SelectTrigger className="w-[180px] h-9 bg-background/50 border-border/50">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Clientes</SelectItem>
            {contacts.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Responsible Filter (hidden for colaborador) */}
        {!isColaborador && (
          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="w-[180px] h-9 bg-background/50 border-border/50">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {companyProfiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Title search */}
        <Input
          placeholder="Buscar obrigação..."
          value={filterTitle}
          onChange={e => setFilterTitle(e.target.value)}
          className="w-[180px] h-9 bg-background/50 border-border/50"
        />

        {/* View Toggle */}
        <div className="ml-auto">
          <ToggleGroup type="single" value={viewMode} onValueChange={v => v && setViewMode(v as ViewMode)} className="border border-border/50 rounded-md p-0.5">
            <ToggleGroupItem value="kanban" className="h-8 w-8 p-0" title="Kanban">
              <Kanban className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="h-8 w-8 p-0" title="Lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" className="h-8 w-8 p-0" title="Calendário">
              <CalendarDays className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Views */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          tasks={tasks}
          contactsMap={contactsMap}
          profilesMap={profilesMap}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
        />
      )}

      {viewMode === 'list' && (
        <TaskListView
          tasks={tasks}
          contactsMap={contactsMap}
          profilesMap={profilesMap}
          onTaskClick={handleTaskClick}
          onDelete={id => deleteTask.mutate(id)}
          canDelete={canDelete}
        />
      )}

      {viewMode === 'calendar' && (
        <TaskCalendarView
          tasks={tasks}
          contactsMap={contactsMap}
          onTaskClick={handleTaskClick}
        />
      )}

      {/* Create Modal */}
      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        contacts={contacts.map(c => ({ id: c.id, name: c.name, responsible_id: (c as any).responsible_id }))}
        profiles={companyProfiles}
        onSubmit={handleCreate}
        isLoading={createTask.isPending}
      />

      {/* Detail Modal */}
      <TaskDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        task={selectedTask}
        contacts={contacts.map(c => ({ id: c.id, name: c.name }))}
        profiles={companyProfiles}
        onUpdate={(id, data) => updateTask.mutate({ id, ...data })}
        onDelete={id => deleteTask.mutate(id)}
      />
    </div>
  );
}
