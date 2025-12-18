import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Mail, Plus, Save, StickyNote } from 'lucide-react';
import { useContactMessages, ContactMessageInsert } from '@/hooks/useContactMessages';
import { useContacts } from '@/hooks/useContacts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ContactCommunicationTabProps {
  contactId: string;
  initialNotes?: string | null;
}

export function ContactCommunicationTab({ contactId, initialNotes }: ContactCommunicationTabProps) {
  const { messages, isLoading, createMessage } = useContactMessages(contactId);
  const { updateContact } = useContacts();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState(initialNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState<Partial<ContactMessageInsert>>({
    channel: 'whatsapp',
    message: '',
    status: 'enviado',
  });

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await updateContact.mutateAsync({
        id: contactId,
        notes,
      });
      toast({
        title: 'Notas salvas',
        description: 'As observações foram atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar notas',
        description: 'Não foi possível salvar as observações.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddMessage = async () => {
    if (!newMessage.message?.trim()) return;
    
    await createMessage.mutateAsync({
      contact_id: contactId,
      channel: newMessage.channel as 'whatsapp' | 'email',
      message: newMessage.message,
      status: newMessage.status as 'enviado' | 'falhou' | 'pendente',
    });
    
    setNewMessage({ channel: 'whatsapp', message: '', status: 'enviado' });
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages Log */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Log de Mensagens
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Nova Mensagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Comunicação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={newMessage.channel}
                    onValueChange={(value) => setNewMessage({ ...newMessage, channel: value as 'whatsapp' | 'email' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Descreva a comunicação realizada..."
                    value={newMessage.message}
                    onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newMessage.status}
                    onValueChange={(value) => setNewMessage({ ...newMessage, status: value as 'enviado' | 'falhou' | 'pendente' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="falhou">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddMessage} 
                  className="w-full"
                  disabled={!newMessage.message?.trim() || createMessage.isPending}
                >
                  {createMessage.isPending ? 'Salvando...' : 'Registrar Comunicação'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {messages && messages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(msg.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {msg.channel === 'whatsapp' ? (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm">WhatsApp</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-blue-500">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">E-mail</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={msg.message}>
                      {msg.message}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          msg.status === 'enviado'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : msg.status === 'pendente'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-red-500/10 text-red-500'
                        }
                      >
                        {msg.status === 'enviado' ? 'Enviado' : msg.status === 'pendente' ? 'Pendente' : 'Falhou'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma comunicação registrada
            </div>
          )}
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notas Internas
          </CardTitle>
          <Button 
            size="sm" 
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            {isSavingNotes ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observações sobre este contato..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Essas notas são privadas e visíveis apenas para sua equipe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
