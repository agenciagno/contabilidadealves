import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Kanban, List, CalendarDays, CalendarIcon, X, ArrowRightLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useContacts } from '@/hooks/useContacts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useFiscalTasks, FiscalTask } from '@/hooks/useFiscalTasks';
import { KanbanBoard } from '@/components/fiscal/KanbanBoard';
import { TaskListView } from '@/components/fiscal/TaskListView';
import { TaskCalendarView } from '@/components/fiscal/TaskCalendarView';
import { TaskDetailModal } from '@/components/fiscal/TaskDetailModal';
import { TaskCreateModal } from '@/components/fiscal/TaskCreateModal';
import { BulkReassignModal } from '@/components/fiscal/BulkReassignModal';
import { SearchableSelect } from '@/components/fiscal/SearchableSelect';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { isContactFiscalEligible } from '@/lib/fiscal-filters';
import { toast } from 'sonner';

type ViewMode = 'kanban' | 'list' | 'calendar';

// DateInput: accepts DD/MM/YYYY typing + popover calendar
function DateInput({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value ? format(value, 'dd/MM/yyyy') : '');
  useEffect(() => {
    setText(value ? format(value, 'dd/MM/yyyy') : '');
  }, [value]);

  const commit = (raw: string) => {
    if (!raw.trim()) {
      onChange(undefined);
      return;
    }
    const parsed = parse(raw, 'dd/MM/yyyy', new Date());
    if (isValid(parsed)) onChange(parsed);
    else setText(value ? format(value, 'dd/MM/yyyy') : '');
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder={placeholder}
        className="h-9 w-[120px] text-sm"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0">
            <CalendarIcon className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}


export default function FiscalTasks() {
  const { company } = useCompany();
  const companyId = company?.id;
  const { isColaborador, isSuperAdmin, isAdmin } = useUserRole();
  const { contacts } = useContacts();

  // Filters
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterContact, setFilterContact] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterObligation, setFilterObligation] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // Pre-populate responsible from URL (?responsible=<profileId>)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const r = searchParams.get('responsible');
    if (r && r !== filterResponsible) {
      setFilterResponsible(r);
      setViewMode('list');
      const next = new URLSearchParams(searchParams);
      next.delete('responsible');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<FiscalTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Profiles for responsible dropdown — only collaborators with active clients assigned
  const { data: companyProfiles = [] } = useQuery({
    queryKey: ['company-profiles-fiscal-with-clients', companyId],
    queryFn: async () => {
      const { data: contactRows, error: e1 } = await supabase
        .from('contacts')
        .select('responsible_id')
        .eq('company_id', companyId!)
        .eq('is_active', true)
        .not('responsible_id', 'is', null);
      if (e1) throw e1;
      const ids = Array.from(new Set((contactRows ?? []).map((r: any) => r.responsible_id).filter(Boolean)));
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', companyId!)
        .eq('status_active', true)
        .in('id', ids);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Obligations catalog for dropdown
  const { data: obligations = [] } = useQuery({
    queryKey: ['fiscal-obligations-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fiscal_obligations_catalog')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const filters = useMemo(() => ({
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    contactId: filterContact !== 'all' ? filterContact : undefined,
    responsibleId: filterResponsible !== 'all' ? filterResponsible : undefined,
    titleSearch: filterObligation !== 'all'
      ? (obligations.find((o) => o.id === filterObligation)?.name)
      : undefined,
  }), [startDate, endDate, filterContact, filterResponsible, filterObligation, obligations]);

  const { tasks, isLoading, createTask, updateTask, deleteTask } = useFiscalTasks(filters);

  // Only contacts eligible for the Fiscal module (active + tax regime set)
  const fiscalContacts = useMemo(
    () => (contacts ?? []).filter((c: any) => isContactFiscalEligible(c)),
    [contacts],
  );

  const contactsMap = useMemo(() => {
    const map: Record<string, string> = {};
    fiscalContacts.forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [fiscalContacts]);

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

  const profileOptions = useMemo(
    () => companyProfiles.map((p) => ({ id: p.id, name: p.full_name || p.email || '—' })),
    [companyProfiles],
  );

  const toggleSelected = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = (ids: string[], allSelected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const rangeSelect = (ids: string[]) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedTaskIds(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from('fiscal_tasks').delete().in('id', ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`✅ ${ids.length} tarefa${ids.length === 1 ? '' : 's'} excluída${ids.length === 1 ? '' : 's'} com sucesso`);
    clearSelection();
    queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
  };

  const handleInlineReassign = async (taskId: string, newId: string) => {
    try {
      await (supabase as any).from('fiscal_tasks').update({ responsible_id: newId }).eq('id', taskId);
      const name = profileOptions.find((p) => p.id === newId)?.name ?? 'colaborador';
      toast.success(`Responsável alterado para ${name}`);
      queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao alterar responsável');
    }
  };

  const handleBulkReassign = async (newId: string, expandToMonth: boolean) => {
    if (!companyId) return;
    let ids = Array.from(selectedTaskIds);
    if (expandToMonth) {
      const selectedTasks = tasks.filter((t) => selectedTaskIds.has(t.id));
      const contactIds = Array.from(new Set(selectedTasks.map((t) => t.contact_id).filter(Boolean)));
      const now = new Date();
      if (contactIds.length > 0) {
        const { data } = await (supabase as any)
          .from('fiscal_tasks')
          .select('id')
          .eq('company_id', companyId)
          .eq('competence_year', now.getFullYear())
          .eq('competence_month', now.getMonth() + 1)
          .in('contact_id', contactIds)
          .in('status', ['pendente', 'em_andamento', 'a_fazer', 'em_progresso', 'aguardando_cliente']);
        ids = Array.from(new Set([...(ids), ...((data ?? []) as any[]).map((r) => r.id)]));
      }
    }
    if (ids.length === 0) {
      toast.error('Nenhuma tarefa para transferir.');
      return;
    }
    const { error } = await (supabase as any).from('fiscal_tasks').update({ responsible_id: newId }).in('id', ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    const name = profileOptions.find((p) => p.id === newId)?.name ?? 'colaborador';
    toast.success(`✅ ${ids.length} tarefa${ids.length === 1 ? '' : 's'} transferida${ids.length === 1 ? '' : 's'} para ${name}`);
    queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
    clearSelection();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-4 flex-wrap gap-4">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">De:</span>
          <DateInput value={startDate} onChange={setStartDate} placeholder="DD/MM/AAAA" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Até:</span>
          <DateInput value={endDate} onChange={setEndDate} placeholder="DD/MM/AAAA" />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
          >
            <X className="h-3.5 w-3.5" /> Limpar datas
          </Button>
        )}

        {/* Client Filter */}
        <SearchableSelect
          value={filterContact}
          onChange={setFilterContact}
          options={fiscalContacts.map((c: any) => ({ value: c.id, label: c.name }))}
          placeholder="Todos os clientes"
          allLabel="Todos os clientes"
          width="w-[200px]"
        />

        {/* Responsible Filter (hidden for colaborador) */}
        {!isColaborador && (
          <SearchableSelect
            value={filterResponsible}
            onChange={setFilterResponsible}
            options={companyProfiles.map((p) => ({ value: p.id, label: p.full_name || p.email || '—' }))}
            placeholder="Todos os colaboradores"
            allLabel="Todos os colaboradores"
            width="w-[200px]"
          />
        )}

        {/* Obligation Filter */}
        <SearchableSelect
          value={filterObligation}
          onChange={setFilterObligation}
          options={obligations.map((o) => ({ value: o.id, label: o.name }))}
          placeholder="Todas as obrigações"
          allLabel="Todas as obrigações"
          width="w-[220px]"
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
          onEdit={handleTaskClick}
          onDelete={canDelete ? (id) => deleteTask.mutate(id) : undefined}
        />
      )}

      {viewMode === 'list' && (
        <>
          {selectedTaskIds.size > 0 && (
            <div className="sticky top-14 z-30 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/5 backdrop-blur">
              <span className="text-sm font-medium text-foreground">
                {selectedTaskIds.size} tarefa{selectedTaskIds.size === 1 ? '' : 's'} selecionada{selectedTaskIds.size === 1 ? '' : 's'}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={clearSelection} className="gap-1.5">
                  <X className="w-3.5 h-3.5" /> Desmarcar tudo
                </Button>
                <Button size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir Responsabilidade
                </Button>
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir selecionados
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir tarefas selecionadas</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir {selectedTaskIds.size} tarefa{selectedTaskIds.size === 1 ? '' : 's'} selecionada{selectedTaskIds.size === 1 ? '' : 's'}? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleBulkDelete}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}
          <TaskListView
            tasks={tasks}
            contactsMap={contactsMap}
            profilesMap={profilesMap}
            onTaskClick={handleTaskClick}
            onDelete={id => deleteTask.mutate(id)}
            canDelete={canDelete}
            selectedIds={selectedTaskIds}
            onToggleSelected={toggleSelected}
            onToggleAll={toggleAll}
            onRangeSelect={rangeSelect}
            profileOptions={!isColaborador ? profileOptions : undefined}
            onReassign={!isColaborador ? handleInlineReassign : undefined}
          />
        </>
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

      <BulkReassignModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        count={selectedTaskIds.size}
        profiles={profileOptions}
        onConfirm={handleBulkReassign}
      />
    </div>
  );
}
