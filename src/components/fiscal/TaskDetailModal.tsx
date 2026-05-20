import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Paperclip, CheckCircle, X } from 'lucide-react';
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

  const handleSave = () => {
    const updates: Partial<FiscalTask> = { notes };

    if (canEdit) {
      updates.title = title;
      updates.description = description || null;
      updates.due_date = dueDate;
      updates.responsible_id = responsibleId || null;

      // Validate concluido requires attachment
      if (status === 'concluido' && !attachmentUrl) {
        toast({ title: 'Anexo obrigatório para concluir', variant: 'destructive' });
        return;
      }
      updates.status = status as FiscalTask['status'];
    }

    onUpdate(task.id, updates);
    onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label>Obrigação</Label>
            {canEdit ? (
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            ) : (
              <p className="text-sm text-foreground mt-1">{title}</p>
            )}
          </div>

          {/* Client (always readonly) */}
          <div>
            <Label>Cliente</Label>
            <p className="text-sm text-foreground mt-1">{contactName}</p>
          </div>

          {/* Responsible */}
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
              <p className="text-sm text-foreground mt-1">
                {profiles.find(p => p.id === responsibleId)?.full_name || '—'}
              </p>
            )}
          </div>

          {/* Due date */}
          <div>
            <Label>Data de Vencimento</Label>
            {canEdit ? (
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            ) : (
              <p className="text-sm text-foreground mt-1">{dueDate}</p>
            )}
          </div>

          {/* Status */}
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
              <Badge variant="outline" className="mt-1">
                {STATUS_OPTIONS.find(s => s.value === status)?.label}
              </Badge>
            )}
          </div>

          {/* Description */}
          {canEdit && (
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          )}

          {/* Notes (editable by everyone) */}
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Adicione observações..." />
          </div>

          {/* Attachment */}
          <div>
            <Label>Anexo</Label>
            {attachmentUrl ? (
              <div className="flex items-center gap-2 mt-1">
                <Paperclip className="w-4 h-4 text-primary" />
                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate">
                  Ver anexo
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Nenhum anexo</p>
            )}
            <div className="mt-2">
              <Label htmlFor="task-attachment" className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md hover:bg-muted/50 transition-colors w-fit">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploading ? 'Enviando...' : 'Enviar arquivo'}</span>
                </div>
              </Label>
              <input
                id="task-attachment"
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <div>
              {canEdit && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onDelete(task.id); onOpenChange(false); }}
                >
                  Excluir
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
              <Button size="sm" onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
