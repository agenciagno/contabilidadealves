import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, User, Lock, AtSign, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { z } from 'zod';
import { PasswordStrength, isPasswordStrong } from '@/components/ui/PasswordStrength';

const ALL_MODULES = [
  { key: 'financeiro', label: 'Financeiro', soon: false },
  { key: 'crm', label: 'CRM / Clientes', soon: false },
  { key: 'relatorios', label: 'Relatórios', soon: false },
  { key: 'comercial', label: 'Comercial', soon: true },
  { key: 'fiscal', label: 'Fiscal', soon: true },
  { key: 'pessoal_rh', label: 'Pessoal / RH', soon: true },
  { key: 'configuracoes', label: 'Configurações', soon: false },
];

const createSchema = z.object({
  fullName: z.string().min(2, 'Nome completo é obrigatório'),
  username: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e underline'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Necessária uma letra maiúscula')
    .regex(/[a-z]/, 'Necessária uma letra minúscula')
    .regex(/[0-9]/, 'Necessário um número'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

const editSchema = z.object({
  fullName: z.string().min(2, 'Nome completo é obrigatório'),
  username: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e underline'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

export interface EditUserData {
  userId: string;
  fullName: string;
  username: string;
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { addNotification } = useNotifications();
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [allowedModules, setAllowedModules] = useState<string[]>(
    ALL_MODULES.map(m => m.key)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (open && editUser) {
      setFormData({
        fullName: editUser.fullName,
        username: editUser.username,
        password: '',
        confirmPassword: '',
      });
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
    setFormData({ fullName: '', username: '', password: '', confirmPassword: '' });
    setAllowedModules(ALL_MODULES.map(m => m.key));
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const schema = isEditMode ? editSchema : createSchema;
    const result = schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (formData.password && !isPasswordStrong(formData.password)) {
      setErrors({ password: 'A senha não atende aos requisitos mínimos de segurança' });
      return;
    }

    if (allowedModules.length === 0) {
      toast.error('Selecione pelo menos um módulo de acesso');
      return;
    }

    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (isEditMode) {
        // EDIT MODE
        const payload: Record<string, unknown> = {
          userId: editUser!.userId,
          fullName: formData.fullName,
          username: formData.username.toLowerCase(),
          allowedModules,
        };
        if (formData.password) payload.password = formData.password;

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
        // CREATE MODE
        // Check if username is already taken
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', formData.username.toLowerCase())
          .maybeSingle();

        if (existingUser) {
          setErrors({ username: 'Este nome de usuário já está em uso' });
          setIsLoading(false);
          return;
        }

        const internalEmail = `${formData.username.toLowerCase()}@internal.local`;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-v2`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              email: internalEmail,
              password: formData.password,
              fullName: formData.fullName,
              companyId,
              username: formData.username.toLowerCase(),
              allowedModules,
            }),
          }
        );

        const result2 = await res.json();
        if (!res.ok) throw new Error(result2.error || 'Erro ao criar usuário');

        addNotification({
          title: 'Novo Usuário Criado',
          description: `Usuário "${formData.fullName}" criado com sucesso.`,
          type: 'success',
          category: 'sucesso'
        });

        toast.success('Usuário criado com sucesso!');
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
          <DialogTitle>{isEditMode ? 'Editar Usuário' : 'Novo Usuário Interno'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="João Silva"
                  className="pl-10"
                  value={formData.fullName}
                  onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              {errors.fullName && <p className="text-destructive text-sm">{errors.fullName}</p>}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário *</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="joao.silva"
                  className="pl-10"
                  value={formData.username}
                  onChange={e => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                />
              </div>
              {errors.username && <p className="text-destructive text-sm">{errors.username}</p>}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditMode ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isEditMode ? 'Deixe em branco para manter' : '••••••••'}
                className="pl-10 pr-10"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
            {formData.password && <PasswordStrength password={formData.password} />}
          </div>

          {/* Confirm Password */}
          {(!isEditMode || formData.password) && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha {!isEditMode && '*'}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.confirmPassword}
                  onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword}</p>}
            </div>
          )}

          {/* Módulos de Acesso */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <Label className="font-semibold">Módulos de Acesso *</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 bg-muted/30">
              {ALL_MODULES.map(mod => (
                <label
                  key={mod.key}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={allowedModules.includes(mod.key)}
                    onCheckedChange={() => toggleModule(mod.key)}
                  />
                  <span className="text-sm">{mod.label}</span>
                  {mod.soon && (
                    <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                      Em breve
                    </Badge>
                  )}
                </label>
              ))}
            </div>
            {allowedModules.length === 0 && (
              <p className="text-destructive text-sm">Selecione pelo menos um módulo</p>
            )}
          </div>

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
