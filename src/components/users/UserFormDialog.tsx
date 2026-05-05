import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { z } from 'zod';

const ALL_MODULES = [
  { key: 'home', label: 'Home', soon: false },
  { key: 'legalizacao', label: 'Legalização', soon: false },
  { key: 'fiscal', label: 'Fiscal', soon: false },
  { key: 'pessoal_rh', label: 'Pessoal / RH', soon: false },
  { key: 'financeiro', label: 'Financeiro', soon: false },
  { key: 'clientes', label: 'Clientes', soon: false },
  { key: 'configuracoes', label: 'Configurações', soon: false },
];

const ROLE_OPTIONS = [
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const formSchema = z.object({
  fullName: z.string().min(2, 'Nome completo é obrigatório'),
  email: z.string().email('Email inválido'),
});

export interface EditUserData {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  statusActive: boolean;
  allowedModules: string[];
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
  editUser?: EditUserData;
}

export default function UserFormDialog({ open, onOpenChange, companyId, onSuccess, editUser }: UserFormDialogProps) {
  const isEditMode = !!editUser;
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotifications();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('colaborador');
  const [statusActive, setStatusActive] = useState(true);
  const [allowedModules, setAllowedModules] = useState<string[]>(ALL_MODULES.map(m => m.key));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && editUser) {
      setFullName(editUser.fullName);
      setEmail(editUser.email);
      setRole(editUser.role);
      setStatusActive(editUser.statusActive);
      setAllowedModules(editUser.allowedModules);
      setErrors({});
    } else if (open && !editUser) {
      resetForm();
    }
  }, [open, editUser]);

  const toggleModule = (key: string) => {
    setAllowedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRole('colaborador');
    setStatusActive(true);
    setAllowedModules(ALL_MODULES.map(m => m.key));
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse({ fullName, email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (role === 'colaborador' && allowedModules.length === 0) {
      toast.error('Selecione pelo menos um módulo de acesso');
      return;
    }

    setIsLoading(true);
    try {

      if (isEditMode) {
        const payload: Record<string, unknown> = {
          userId: editUser!.userId,
          fullName,
          role,
          statusActive,
          allowedModules: role === 'colaborador' ? allowedModules : ALL_MODULES.map(m => m.key),
        };

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-v2`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar usuário');

        toast.success('Usuário atualizado com sucesso!');
        onSuccess();
        handleClose();
      } else {
        // CREATE MODE — default password
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-v2`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              email,
              password: 'Mudar@123',
              fullName,
              companyId,
              role,
              statusActive,
              forcePasswordChange: true,
              allowedModules: role === 'colaborador' ? allowedModules : ALL_MODULES.map(m => m.key),
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');

        addNotification({
          title: 'Novo Usuário Criado',
          description: `Usuário "${fullName}" criado com sucesso.`,
          type: 'success',
          category: 'sucesso'
        });

        toast.success('Usuário criado com sucesso! Senha temporária: Mudar@123');
        onSuccess();
        handleClose();
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || (isEditMode ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="João Silva"
                className="pl-10"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
            {errors.fullName && <p className="text-destructive text-sm">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                className="pl-10"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isEditMode}
              />
            </div>
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <Label>Status</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{statusActive ? 'Ativo' : 'Inativo'}</span>
              <Switch checked={statusActive} onCheckedChange={setStatusActive} />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Nível de Acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Módulos — only for Colaborador */}
          {role === 'colaborador' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <Label className="font-semibold">Módulos de Acesso</Label>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 bg-muted/30">
                {ALL_MODULES.map(mod => (
                  <label key={mod.key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowedModules.includes(mod.key)}
                      onChange={() => toggleModule(mod.key)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{mod.label}</span>
                    {mod.soon && (
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4">Em breve</Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isEditMode && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              O usuário receberá a senha temporária <span className="font-mono font-medium text-foreground">Mudar@123</span> e será obrigado a trocá-la no primeiro acesso.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
