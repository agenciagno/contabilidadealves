import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  AcessoPortal,
  PORTAL_OPTIONS,
  PortalTipo,
  useSalvarAcesso,
} from '@/hooks/useAcessosCliente';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  acesso?: AcessoPortal | null;
}

export function AcessoFormDialog({ open, onOpenChange, contactId, acesso }: Props) {
  const isEdit = !!acesso;
  const [portal, setPortal] = useState<PortalTipo>('gov_br');
  const [portalLabel, setPortalLabel] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [validade, setValidade] = useState<Date | undefined>(undefined);
  const [observacao, setObservacao] = useState('');

  const salvar = useSalvarAcesso();

  useEffect(() => {
    if (open) {
      setPortal((acesso?.portal as PortalTipo) ?? 'gov_br');
      setPortalLabel(acesso?.portal_label ?? '');
      setLogin(acesso?.login ?? '');
      setSenha('');
      setShowSenha(false);
      setValidade(acesso?.validade_certificado ? new Date(acesso.validade_certificado + 'T00:00:00') : undefined);
      setObservacao(acesso?.observacao ?? '');
    }
  }, [open, acesso]);

  const handleSubmit = async () => {
    if (!isEdit && !senha) {
      toast.error('Informe a senha.');
      return;
    }
    try {
      await salvar.mutateAsync({
        acesso_id: acesso?.id,
        contact_id: contactId,
        portal,
        portal_label: portalLabel || null,
        login: login || null,
        senha: senha || undefined,
        validade_certificado: validade ? format(validade, 'yyyy-MM-dd') : null,
        observacao: observacao || null,
      });
      toast.success('Acesso salvo com segurança');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar acesso.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar acesso' : 'Adicionar acesso'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Portal</Label>
            <Select value={portal} onValueChange={(v) => setPortal(v as PortalTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Complemento / rótulo (opcional)</Label>
            <Input
              value={portalLabel}
              onChange={(e) => setPortalLabel(e.target.value)}
              placeholder="Ex: Prefeitura de BH"
            />
          </div>

          <div className="space-y-2">
            <Label>Login</Label>
            <Input value={login} onChange={(e) => setLogin(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Senha</Label>
            <div className="relative">
              <Input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={isEdit ? 'Deixe em branco para manter a atual' : ''}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSenha((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {portal === 'certificado_digital' && (
            <div className="space-y-2">
              <Label>Validade do certificado</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !validade && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validade ? format(validade, 'dd/MM/yyyy') : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validade}
                    onSelect={setValidade}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
