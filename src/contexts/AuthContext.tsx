import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, companyName: string, cnpj: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (emailOrCnpj: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, companyName: string, cnpj: string, fullName: string) => {
    try {
      // 1. Criar empresa primeiro (sem auth, precisa de policy para insert anônimo)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({ name: companyName, cnpj })
        .select()
        .single();

      if (companyError) {
        if (companyError.message.includes('duplicate')) {
          return { error: new Error('Este CNPJ já está cadastrado') };
        }
        return { error: companyError };
      }

      // 2. Criar usuário
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            company_id: companyData.id,
            full_name: fullName,
          }
        }
      });

      if (signUpError) {
        // Deletar empresa se signup falhou
        await supabase.from('companies').delete().eq('id', companyData.id);
        return { error: signUpError };
      }

      // 3. Criar perfil e role
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            company_id: companyData.id,
            full_name: fullName,
            email: email,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'admin',
          });

        if (roleError) {
          console.error('Role creation error:', roleError);
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (emailOrCnpj: string, password: string) => {
    try {
      let email = emailOrCnpj;

      // Verificar se é CNPJ
      const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
      if (cnpjRegex.test(emailOrCnpj.replace(/\D/g, ''))) {
        // Buscar email pelo CNPJ
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('cnpj', emailOrCnpj)
          .maybeSingle();

        if (company) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('company_id', company.id)
            .maybeSingle();

          if (profile?.email) {
            email = profile.email;
          }
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: new Error('Email/CNPJ ou senha incorretos') };
        }
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
