import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Upload, Paperclip, CheckCircle, Trash2, Send } from 'lucide-react';
import { FiscalTask } from '@/hooks/useFiscalTasks';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface TeamNote {
  profile_id: string | null;
  profile_name: string;
  text: string;
  created_at: string;
  legacy?: boolean;
}

function parseNotes(raw: string | null, legacyDate: string): TeamNote[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((n) => n && typeof n.text === 'string').map((n: any) => ({
        profile_id: n.profile_id ?? null,
        profile_name: n.profile_name || '—',
        text: String(n.text),
        created_at: n.created_at || legacyDate,
      }));
    }
  } catch { /* fallthrough to legacy */ }
  return [{ profile_id: null, profile_name: 'Histórico', text: trimmed, created_at: legacyDate, legacy: true }];
}

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: FiscalTask | null;
  contacts: { id: string; name: string }[];
  profiles: { id: string; full_name: string | null }[];
  onUpdate: (id: string, data: Partial<FiscalTask>) => void;
  onDelete: (id: string) => void;
  groupTasks?: FiscalTask[] | null;
  onUploadForTask?: (task: FiscalTask, file: File) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'a_fazer', label: 'A Fazer' },
  { value: 'aguardando_cliente', label: 'Aguardando Cliente' },
  { value: 'em_progresso', label: 'Em Progresso' },
  { value: 'concluido', label: 'Concluído' },
];

const statusBadgeClass: Record<string, string> = {
  a_fazer: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  aguardando_cliente: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  em_progresso: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  concluido: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};

export function TaskDetailModal({ open, onOpenChange, task, contacts, profiles, onUpdate, onDelete, groupTasks, onUploadForTask }: TaskDetailModalProps) {
  const { isColaborador, isSuperAdmin, isAdmin } = useUserRole();
  const { company } = useCompany();
  const { user } = useAuth();
  const companyId = company?.id;
  const { toast } = useToast();
  const canEdit = isSuperAdmin || isAdmin;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('a_fazer');
  const [dueDate, setDueDate] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [notesRaw, setNotesRaw] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setDueDate(task.due_date);
      setResponsibleId(task.responsible_id || '');
      setNotesRaw(task.notes ?? null);
      setNewNote('');
      setAttachmentUrl(task.attachment_url);
    }
  }, [task]);

  // Current user's profile (for authoring notes)
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile-notes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const teamNotes = useMemo<TeamNote[]>(() => {
    if (!task) return [];
    const list = parseNotes(notesRaw, task.created_at);
    return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [notesRaw, task]);

  if (!task) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `fiscal/${companyId}/${task.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('transaction-attachments')
        .upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('transaction-attachments')
        .getPublicUrl(path);

      setAttachmentUrl(urlData.publicUrl);
      setStatus('concluido');
      onUpdate(task.id, { attachment_url: urlData.publicUrl, status: 'concluido' });
      toast({ title: '✅ Anexo adicionado. Tarefa marcada como concluída.' });
    } catch {
      toast({ title: 'Erro ao enviar anexo', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTaskInfo = () => {
    if (!canEdit) return;
    if (status === 'concluido' && !attachmentUrl) {
      toast({ title: 'Anexo obrigatório para concluir', variant: 'destructive' });
      return;
    }
    onUpdate(task.id, {
      title,
      description: description || null,
      due_date: dueDate,
      responsible_id: responsibleId || null,
      status: status as FiscalTask['status'],
    });
    toast({ title: '✅ Tarefa atualizada.' });
  };

  const handleAddNote = () => {
    const text = newNote.trim();
    if (!text) return;
    const authorName = currentProfile?.full_name || currentProfile?.email?.split('@')[0] || 'Usuário';
    const entry: TeamNote = {
      profile_id: currentProfile?.id ?? null,
      profile_name: authorName,
      text,
      created_at: new Date().toISOString(),
    };
    const next = [...teamNotes.filter((n) => !n.legacy || true), entry];
    // Persist as JSON array (legacy item is included so it survives)
    const serializable = next.map(({ legacy, ...rest }) => rest);
    const json = JSON.stringify(serializable);
    setNotesRaw(json);
    setNewNote('');
    onUpdate(task.id, { notes: json });
    toast({ title: '✅ Nota adicionada.' });
  };

  const handleMarkComplete = () => {
    if (!attachmentUrl) {
      toast({ title: 'Anexe um arquivo antes de concluir', variant: 'destructive' });
      return;
    }
    onUpdate(task.id, { status: 'concluido' });
    onOpenChange(false);
  };


  const contactName = contacts.find(c => c.id === task.contact_id)?.name || '—';
  const responsibleName = profiles.find(p => p.id === responsibleId)?.full_name || '—';
  const competencia = task.due_date ? format(parseISO(task.due_date), 'MM/yyyy') : '—';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2 pb-4">
          <SheetTitle className="text-2xl">{contactName}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusBadgeClass[status]}>
              {STATUS_OPTIONS.find(s => s.value === status)?.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Vencimento: {dueDate ? format(parseISO(dueDate), 'dd/MM/yyyy') : '—'}
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* Informações da tarefa */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Informações da Tarefa</h3>

            <div>
              <Label>Obrigação</Label>
              {groupTasks && groupTasks.length > 1 ? (
                <p className="text-sm text-foreground mt-1">{groupTasks.length} obrigações</p>
              ) : canEdit ? (
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              ) : (
                <p className="text-sm text-foreground mt-1">{title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cliente</Label>
                <p className="text-sm text-foreground mt-1">{contactName}</p>
              </div>
              <div>
                <Label>Competência</Label>
                <p className="text-sm text-foreground mt-1">{competencia}</p>
              </div>
            </div>

            <div>
              <Label>Responsável</Label>
              {canEdit ? (
                <Select value={responsibleId} onValueChange={setResponsibleId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || 'Sem nome'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-foreground mt-1">{responsibleName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Vencimento</Label>
                {canEdit ? (
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                ) : (
                  <p className="text-sm text-foreground mt-1">{dueDate ? format(parseISO(dueDate), 'dd/MM/yyyy') : '—'}</p>
                )}
              </div>
              <div>
                <Label>Status</Label>
                {canEdit ? (
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`mt-1 ${statusBadgeClass[status]}`}>
                    {STATUS_OPTIONS.find(s => s.value === status)?.label}
                  </Badge>
                )}
              </div>
            </div>

            {canEdit && (
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
            )}

            {canEdit && (
              <Button size="sm" onClick={handleSaveTaskInfo}>Salvar alterações</Button>
            )}
          </section>

          <Separator />

          {/* Checklist de documentos */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Checklist de Documentos</h3>

            {groupTasks && groupTasks.length > 1 ? (
              <div className="rounded-md border border-border/50 p-3 space-y-2">
                {groupTasks.map((gt) => (
                  <ChecklistRow
                    key={gt.id}
                    task={gt}
                    onUpload={onUploadForTask}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {attachmentUrl ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-sm border border-muted-foreground/40 shrink-0" />
                    )}
                    <span className="text-sm truncate">{title}</span>
                  </div>
                  {attachmentUrl ? (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline shrink-0 inline-flex items-center gap-1"
                    >
                      <Paperclip className="w-3 h-3" /> Ver anexo
                    </a>
                  ) : (
                    <Label htmlFor="task-attachment-detail" className="cursor-pointer shrink-0">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-border hover:bg-muted/50 text-xs">
                        <Upload className="w-3 h-3" />
                        {uploading ? 'Enviando...' : '📎 Anexar'}
                      </div>
                    </Label>
                  )}
                  <input
                    id="task-attachment-detail"
                    type="file"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </div>
                {attachmentUrl && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    ✅ Documento anexado
                  </Badge>
                )}
              </div>
            )}
          </section>

          <Separator />

          {/* Observações */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Observações</h3>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Adicionar observação..."
            />
            <Button size="sm" variant="outline" onClick={handleSaveNotes}>
              Salvar observação
            </Button>
          </section>

          <Separator />

          {/* Footer actions */}
          <div className="flex justify-between pt-2">
            <div>
              {canEdit && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onDelete(task.id); onOpenChange(false); }}
                >
                  <Trash2 className="w-4 h-4" /> Excluir tarefa
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {isColaborador && task.status !== 'concluido' && (
                <Button size="sm" variant="outline" onClick={handleMarkComplete} className="gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Concluir
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChecklistRow({
  task,
  onUpload,
}: {
  task: FiscalTask;
  onUpload?: (task: FiscalTask, file: File) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const done = task.status === 'concluido' || !!task.attachment_url;
  const inputId = `chk-${task.id}`;

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    try {
      setUploading(true);
      await onUpload(task, file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {done ? (
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <div className="w-4 h-4 rounded-sm border border-muted-foreground/40 shrink-0" />
        )}
        <span className={`text-sm truncate ${done ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </span>
      </div>
      {done && task.attachment_url ? (
        <a
          href={task.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline shrink-0 inline-flex items-center gap-1"
        >
          <Paperclip className="w-3 h-3" /> Ver anexo
        </a>
      ) : done ? (
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shrink-0">
          ✅ Anexado
        </Badge>
      ) : (
        <>
          <Label htmlFor={inputId} className="cursor-pointer shrink-0">
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded border border-dashed border-border hover:bg-muted/50 text-xs">
              <Upload className="w-3 h-3" />
              {uploading ? 'Enviando...' : '📎 Anexar'}
            </div>
          </Label>
          <input id={inputId} type="file" className="hidden" onChange={handle} disabled={uploading} />
        </>
      )}
    </div>
  );
}
