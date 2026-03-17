import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Separator } from '@/components/ui/separator';
import { Moon, Sun, Monitor, Loader2, Upload, Building2, Palette, Check, Lightbulb, Trash2, History, Users, Building, Shield, Mail, User as UserIcon, AlertCircle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import UsersTab from '@/components/users/UsersTab';
import GlobalLogsTab from '@/components/settings/GlobalLogsTab';
import ClientCompaniesTab from '@/components/settings/ClientCompaniesTab';
import TrashTab from '@/components/settings/TrashTab';
import BackupTab from '@/components/settings/BackupTab';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useProfile } from '@/hooks/useProfile';

// Mask functions
const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

// CNPJ validation
const validateCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(numbers[i]) * weights1[i];
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(numbers[12]) !== digit1) return false;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(numbers[i]) * weights2[i];
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return parseInt(numbers[13]) === digit2;
};

const VALID_DDDS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
];

const validatePhone = (phone: string): boolean => {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 0) return true;
  if (numbers.length < 10 || numbers.length > 11) return false;
  return VALID_DDDS.includes(parseInt(numbers.substring(0, 2)));
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { isSuperAdmin } = useSuperAdmin();
  const { profile, userName, userEmail } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  // Profile editing
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  useEffect(() => {
    async function fetchCompanyData() {
      if (!user) return;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData?.company_id) {
          setCompanyId(profileData.company_id);
          const { data: company } = await supabase
            .from('companies')
            .select('name, cnpj, phone, logo_url')
            .eq('id', profileData.company_id)
            .maybeSingle();

          if (company) {
            setCompanyName(company.name || '');
            setCnpj(company.cnpj || '');
            setPhone(company.phone || '');
            setLogoUrl(company.logo_url);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      } finally {
        setLoadingCompany(false);
      }
    }
    fetchCompanyData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailSent(true);
      toast.success('Verifique o novo email para confirmar a alteração!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar email');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(maskCNPJ(e.target.value));
    setCnpjError(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
    setPhoneError(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!file.type.startsWith('image/')) { toast.error('Por favor, selecione uma imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 2MB'); return; }
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('company-logos').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('companies').update({ logo_url: publicUrl }).eq('id', companyId);
      if (updateError) throw updateError;
      setLogoUrl(publicUrl + '?t=' + Date.now());
      toast.success('Logo atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer upload da logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!companyId || !logoUrl) return;
    setRemovingLogo(true);
    try {
      const { data: files } = await supabase.storage.from('company-logos').list('', { search: companyId });
      if (files && files.length > 0) {
        const fileToDelete = files.find(f => f.name.startsWith(companyId));
        if (fileToDelete) await supabase.storage.from('company-logos').remove([fileToDelete.name]);
      }
      const { error: updateError } = await supabase.from('companies').update({ logo_url: null }).eq('id', companyId);
      if (updateError) throw updateError;
      setLogoUrl(null);
      toast.success('Logo removida com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover logo');
    } finally {
      setRemovingLogo(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!user || !companyId) return;
    if (cnpj && !validateCNPJ(cnpj)) { setCnpjError('CNPJ inválido'); toast.error('CNPJ inválido.'); return; }
    if (phone && !validatePhone(phone)) { setPhoneError('DDD inválido'); toast.error('Telefone com DDD inválido.'); return; }
    setSavingCompany(true);
    try {
      const { error } = await supabase.from('companies').update({ name: companyName, cnpj, phone }).eq('id', companyId);
      if (error) throw error;
      toast.success('Dados da empresa atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar dados da empresa');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) { toast.error('Preencha todos os campos de senha'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    if (newPassword.length < 6) { toast.error('A nova senha deve ter pelo menos 6 caracteres'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="perfil" className="gap-1.5">
            <UserIcon className="w-4 h-4" />
            Perfil & Conta
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5">
            <Users className="w-4 h-4" />
            Minha Equipe
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="empresas" className="gap-1.5">
              <Building className="w-4 h-4" />
              Empresas Clientes
            </TabsTrigger>
          )}
          <TabsTrigger value="logs" className="gap-1.5">
            <History className="w-4 h-4" />
            Logs Globais
          </TabsTrigger>
          <TabsTrigger value="lixeira" className="gap-1.5">
            <Trash2 className="w-4 h-4" />
            Lixeira
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5">
            <Database className="w-4 h-4" />
            Backup
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ ABA 1: PERFIL & CONTA ═══════════ */}
        <TabsContent value="perfil" className="space-y-6 mt-0">

          {/* Perfil Pessoal */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Perfil Pessoal</CardTitle>
                  <CardDescription>Suas informações de identificação no sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email atual</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Perfil
              </Button>
            </CardContent>
          </Card>

          {/* Alterar Email */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Alterar Email de Login</CardTitle>
                  <CardDescription>Um email de confirmação será enviado para o novo endereço</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailSent && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Verifique seu novo email para confirmar a alteração. O email atual permanece ativo até a confirmação.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="novo@email.com"
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setEmailSent(false); }}
                  className="flex-1"
                />
                <Button onClick={handleChangeEmail} disabled={changingEmail || !newEmail} variant="outline">
                  {changingEmail && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Alterar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Aparência */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Aparência</CardTitle>
                  <CardDescription>Personalize a aparência do sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Claro', desc: 'Tema claro do sistema', icon: Sun, iconClass: 'text-amber-500', bgClass: 'bg-amber-100 dark:bg-amber-900/30' },
                  { value: 'dark', label: 'Escuro', desc: 'Tema escuro do sistema', icon: Moon, iconClass: 'text-violet-500', bgClass: 'bg-violet-100 dark:bg-violet-900/30' },
                  { value: 'system', label: 'Sistema', desc: 'Segue as preferências do sistema', icon: Monitor, iconClass: 'text-violet-500', bgClass: 'bg-violet-100 dark:bg-violet-900/30' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value as any)}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all duration-200 text-left hover:border-primary/50',
                      theme === t.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/50'
                    )}
                  >
                    {theme === t.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mb-3', t.bgClass)}>
                      <t.icon className={cn('w-5 h-5', t.iconClass)} />
                    </div>
                    <p className="font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
              {theme === 'system' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Seu sistema está configurado para o tema <span className="font-medium text-foreground">{resolvedTheme === 'dark' ? 'escuro' : 'claro'}</span>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Segurança</CardTitle>
                  <CardDescription>Altere sua senha de acesso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirmar Nova Senha</Label>
                  <Input id="confirmNewPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
                </div>
              </div>
              <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Alterar Senha
              </Button>
            </CardContent>
          </Card>

          {/* Dados da Empresa */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Dados da Empresa</CardTitle>
                  <CardDescription>Informações da sua organização</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingCompany ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Logo */}
                  <div className="space-y-3">
                    <Label>Logo da Empresa</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo da empresa" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo || removingLogo}>
                            {uploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {logoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                          </Button>
                          {logoUrl && (
                            <Button variant="outline" onClick={handleRemoveLogo} disabled={removingLogo || uploadingLogo} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              {removingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      <Input id="companyName" placeholder="Nome da empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" placeholder="00.000.000/0000-00" value={cnpj} onChange={handleCNPJChange} maxLength={18} className={cn(cnpjError && 'border-destructive focus-visible:ring-destructive')} />
                      {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" placeholder="(00) 00000-0000" value={phone} onChange={handlePhoneChange} maxLength={15} className={cn(phoneError && 'border-destructive focus-visible:ring-destructive')} />
                      {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                    </div>
                  </div>

                  <Button onClick={handleSaveCompany} disabled={savingCompany}>
                    {savingCompany && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ ABA 2: MINHA EQUIPE ═══════════ */}
        <TabsContent value="equipe" className="mt-0">
          {companyId && user && (
            <UsersTab companyId={companyId} currentUserId={user.id} />
          )}
        </TabsContent>

        {/* ═══════════ ABA 3: EMPRESAS CLIENTES (só super admin) ═══════════ */}
        {isSuperAdmin && (
          <TabsContent value="empresas" className="mt-0">
            <ClientCompaniesTab />
          </TabsContent>
        )}

        {/* ═══════════ ABA 4: LOGS GLOBAIS ═══════════ */}
        <TabsContent value="logs" className="mt-0">
          <GlobalLogsTab />
        </TabsContent>

        {/* ═══════════ ABA 5: LIXEIRA ═══════════ */}
        <TabsContent value="lixeira" className="mt-0">
          <TrashTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
