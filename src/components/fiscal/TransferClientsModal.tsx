import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collaborator } from '@/hooks/useCollaboratorCoverage';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Source list — only collaborators with active clients */
  sourceCollaborators: Collaborator[];
  /** Destination list — all active fiscal profiles */
  destinationCollaborators: Collaborator[];
  onConfirm: (input: { fromId: string; toId: string; fromName: string; toName: string }) => Promise<void>;
}

export function TransferClientsModal({
  open,
  onOpenChange,
  sourceCollaborators,
  destinationCollaborators,
  onConfirm,
}: Props) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nameOf = (list: Collaborator[], id: string) =>
    list.find((c) => c.id === id)?.full_name || list.find((c) => c.id === id)?.email || '—';

  const fromName = fromId ? nameOf(sourceCollaborators, fromId) : '{origem}';
  const toName = toId ? nameOf(destinationCollaborators, toId) : '{destino}';

  const reset = () => {
    setFromId('');
    setToId('');
  };

  const handleSubmit = async () => {
    if (!fromId || !toId || fromId === toId) return;
    try {
      setSubmitting(true);
      await onConfirm({ fromId, toId, fromName, toName });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferir Clientes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>De:</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Selecione o colaborador de origem" /></SelectTrigger>
              <SelectContent>
                {sourceCollaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                ))}
                {sourceCollaborators.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nenhum colaborador com clientes atribuídos.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Para:</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Selecione o colaborador de destino" /></SelectTrigger>
              <SelectContent>
                {destinationCollaborators
                  .filter((c) => c.id !== fromId)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-md p-3 border border-border/50">
            Todos os clientes e tarefas pendentes de <span className="font-medium text-foreground">{fromName}</span> serão transferidos para <span className="font-medium text-foreground">{toName}</span>.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!fromId || !toId || fromId === toId || submitting}>
            Confirmar Transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
