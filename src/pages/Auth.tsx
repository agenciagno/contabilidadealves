import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Mail, Lock, User, Phone } from 'lucide-react';
import { z } from 'zod';
const loginSchema = z.object({
  emailOrCnpj: z.string().min(1, 'Campo obrigatório'),
  password: z.string().min(6, 'Mínimo 6 caracteres')
});
const signupSchema = z.object({
  companyName: z.string().min(2, 'Nome da empresa é obrigatório'),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  fullName: z.string().min(2, 'Nome completo é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});
function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
}
export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    emailOrCnpj: '',
    password: ''
  });
  const [signupData, setSignupData] = useState({
    companyName: '',
    cnpj: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signIn(loginData.emailOrCnpj, loginData.password);
    setIsLoading(false);
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      navigate('/');
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signUp(signupData.email, signupData.password, signupData.companyName, signupData.cnpj, signupData.fullName);
    setIsLoading(false);
    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você será redirecionado automaticamente.'
      });
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Contabilidade Alves</h1>
          <p className="text-muted-foreground mt-2">Sistema Financeiro</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailOrCnpj">Email ou CNPJ</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="emailOrCnpj" placeholder="email@empresa.com ou 00.000.000/0000-00" className="pl-10" value={loginData.emailOrCnpj} onChange={e => setLoginData(prev => ({
                      ...prev,
                      emailOrCnpj: e.target.value
                    }))} />
                    </div>
                    {errors.emailOrCnpj && <p className="text-destructive text-sm">{errors.emailOrCnpj}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={loginData.password} onChange={e => setLoginData(prev => ({
                      ...prev,
                      password: e.target.value
                    }))} />
                    </div>
                    {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="companyName" placeholder="Minha Empresa LTDA" className="pl-10" value={signupData.companyName} onChange={e => setSignupData(prev => ({
                      ...prev,
                      companyName: e.target.value
                    }))} />
                    </div>
                    {errors.companyName && <p className="text-destructive text-sm">{errors.companyName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="cnpj" placeholder="00.000.000/0000-00" className="pl-10" value={signupData.cnpj} onChange={e => setSignupData(prev => ({
                      ...prev,
                      cnpj: formatCNPJ(e.target.value)
                    }))} maxLength={18} />
                    </div>
                    {errors.cnpj && <p className="text-destructive text-sm">{errors.cnpj}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fullName" placeholder="João Silva" className="pl-10" value={signupData.fullName} onChange={e => setSignupData(prev => ({
                      ...prev,
                      fullName: e.target.value
                    }))} />
                    </div>
                    {errors.fullName && <p className="text-destructive text-sm">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signupEmail" type="email" placeholder="email@empresa.com" className="pl-10" value={signupData.email} onChange={e => setSignupData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))} />
                    </div>
                    {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="signupPassword" type="password" placeholder="••••••" className="pl-10" value={signupData.password} onChange={e => setSignupData(prev => ({
                        ...prev,
                        password: e.target.value
                      }))} />
                      </div>
                      {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="confirmPassword" type="password" placeholder="••••••" className="pl-10" value={signupData.confirmPassword} onChange={e => setSignupData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))} />
                      </div>
                      {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Criar Conta
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>;
}