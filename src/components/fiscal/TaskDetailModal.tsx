import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
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
import { Upload, Paperclip, CheckCircle, Trash2 } from 'lucide-react';
import { FiscalTask } from '@/hooks/useFiscalTasks';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: FiscalTask | null;
  contacts: { id: string; name: string }[];
  profiles: { id: string; full_name: string | null }[];
  onUpdate: (id: string, data: Partial<FiscalTask>) => void;
  onDelete: (id: string) => void;
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

export function TaskDetailModal({ open, onOpenChange, task, contacts, profiles, onUpdate, onDelete }: TaskDetailModalProps) {
  const { isColaborador, isSuperAdmin, isAdmin } = useUserRole();
  const { company } = useCompany();
  const companyId = company?.id;
  const { toast } = useToast();
  const canEdit = isSuperAdmin || isAdmin;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('a_fazer');
  const [dueDate, setDueDate] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setDueDate(task.due_date);
      setResponsibleId(task.responsible_id || '');
      setNotes(task.notes || '');
      setAttachmentUrl(task.attachment_url);
    }
  }, [task]);

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

  const handleSaveNotes = () => {
    onUpdate(task.id, { notes });
    toast({ title: '✅ Observação salva.' });
  };

  const handleMarkComplete = () => {
    if (!attachmentUrl) {
      toast({ title: 'Anexe um arquivo antes de concluir', variant: 'destructive' });
      return;
    }
    onUpdate(task.id, { status: 'concluido', notes });
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
              {canEdit ? (
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
