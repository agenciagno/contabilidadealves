import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BoletoControl {
  id: string;
  company_id: string;
  contact_id: string;
  reference_month: string;
  status: 'PENDING' | 'GENERATED';
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoletoWithContact extends BoletoControl {
  contact_name: string;
  contact_type: string;
  contact_document: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  boleto_value: number | null;
  boleto_due_day: number | null;
}

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) throw new Error('Perfil não encontrado');
  return profile.company_id;
}

export function useBoletoControls(referenceMonth: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Busca boleto_controls do mês
  const { data: boletoControls = [], isLoading: isLoadingControls, refetch: refetchControls } = useQuery({
    queryKey: ['boleto-controls', referenceMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boleto_controls')
        .select('*')
        .eq('reference_month', referenceMonth)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as BoletoControl[];
    },
    staleTime: 1000 * 30,
  });

  // 2. Busca contacts com boleto_active = true
  const { data: activeContacts = [], isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['contacts-boleto-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, type, document, email, phone, boleto_value, boleto_due_day, boleto_start_date, company_id')
        .eq('boleto_active', true)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30,
  });

  const isLoading = isLoadingControls || isLoadingContacts;

  // 3. Mutação para gerar registros do mês (lazy generation)
  const generateMonth = useMutation({
    mutationFn: async (contacts: typeof activeContacts) => {
      const companyId = await getCompanyId();
      const records = contacts.map(c => ({
        company_id: companyId,
        contact_id: c.id,
        reference_month: referenceMonth,
        status: 'PENDING' as const,
      }));
      const { error } = await supabase.from('boleto_controls').insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boleto-controls', referenceMonth] });
    },
    onError: (error: Error) => {
      console.error('Erro ao gerar boletos do mês:', error.message);
    },
  });

  // 4. Sincronização incremental: gera entradas para contatos ainda não listados no mês
  useEffect(() => {
    if (isLoading || generateMonth.isPending) return;
    if (activeContacts.length === 0) return;

    const existingContactIds = new Set(boletoControls.map(bc => bc.contact_id));
    const missingContacts = activeContacts.filter(c => !existingContactIds.has(c.id));

    if (missingContacts.length > 0) {
      generateMonth.mutate(missingContacts);
    }
  }, [isLoading, boletoControls.length, activeContacts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. Mutação para alternar status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'PENDING' ? 'GENERATED' : 'PENDING';
      const { error } = await supabase
        .from('boleto_controls')
        .update({
          status: newStatus,
          generated_at: newStatus === 'GENERATED' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['boleto-controls', referenceMonth] });
      toast({
        title: newStatus === 'GENERATED' ? 'Boleto marcado como Gerado!' : 'Boleto revertido para Pendente',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    },
  });

  // 6. Mescla boleto_controls com dados dos contacts
  const boletoList: BoletoWithContact[] = boletoControls.map(bc => {
    const contact = activeContacts.find(c => c.id === bc.contact_id);
    return {
      ...bc,
      status: bc.status as 'PENDING' | 'GENERATED',
      contact_name: contact?.name ?? '—',
      contact_type: contact?.type ?? 'cliente',
      contact_document: contact?.document ?? null,
      contact_email: contact?.email ?? null,
      contact_phone: contact?.phone ?? null,
      boleto_value: contact?.boleto_value ?? null,
      boleto_due_day: contact?.boleto_due_day ?? null,
    };
  });

  const refreshAll = async () => {
    queryClient.invalidateQueries({ queryKey: ['boleto-controls', referenceMonth] });
    queryClient.invalidateQueries({ queryKey: ['contacts-boleto-active'] });
    await Promise.all([refetchControls(), refetchContacts()]);
  };

  return {
    boletoList,
    isLoading,
    isGenerating: generateMonth.isPending,
    toggleStatus,
    refresh: refreshAll,
    isRefreshing: isLoadingControls || isLoadingContacts,
  };
}
