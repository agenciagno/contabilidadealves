import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Lista explícita de colunas (exclui siare_senha_encrypted)
const SUPER_PERFIL_COLUMNS = [
  'id', 'company_id', 'name', 'type', 'document', 'email', 'phone', 'whatsapp',
  'address', 'address_number', 'complemento', 'neighborhood', 'city', 'state', 'cep',
  'notes', 'is_active', 'created_at', 'updated_at',
  'tax_regime', 'representative_legal', 'cep', 'origin', 'responsible_id',
  'canal_entrega', 'numero_cliente_sicoob', 'enviar_cobranca_auto',
  'categorias', 'razao_social', 'nome_fantasia',
  'cnae_principal', 'cnaes_secundarios', 'natureza_juridica', 'situacao_cadastral',
  'data_abertura_receita', 'segundo_email_contato',
  'ie', 'im', 'regime_apuracao',
  'numero_alvara', 'validade_alvara',
  'status_cliente', 'tipo_cliente', 'tipo_estabelecimento', 'grupo_escritorio',
  'data_inicio_contrato', 'data_abertura_junta', 'data_abertura_rf',
  'data_abertura_estado', 'data_abertura_prefeitura',
  'data_encerramento_junta', 'data_encerramento_rf',
  'data_encerramento_prefeitura', 'data_encerramento_estado',
  'possui_funcionarios', 'numero_funcionarios', 'tipo_cartao_ponto',
  'medicina_trabalho', 'grupo_cipa',
  'registro_entradas', 'registro_saidas', 'registro_icms', 'inventario',
].join(',');

export type SuperPerfil = Record<string, any>;

export function useSuperPerfil(contactId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['super-perfil', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(SUPER_PERFIL_COLUMNS)
        .eq('id', contactId)
        .single();
      if (error) throw error;
      return data as SuperPerfil;
    },
    enabled: !!contactId,
  });

  const updateSuperPerfil = useMutation({
    mutationFn: async (updates: Partial<SuperPerfil>) => {
      // Nunca enviar siare_senha_encrypted nem mexer em type por aqui
      const { siare_senha_encrypted, type, id, company_id, created_at, updated_at, ...safe } = updates as any;
      const { data, error } = await supabase
        .from('contacts')
        .update(safe)
        .eq('id', contactId)
        .select(SUPER_PERFIL_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-perfil', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Cadastro atualizado com sucesso' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    },
  });

  const lookupCnpj = async (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      throw new Error('CNPJ inválido');
    }
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`);
    if (!res.ok) throw new Error('Não foi possível consultar a Receita Federal');
    return res.json();
  };

  return { data, isLoading, error, updateSuperPerfil, lookupCnpj };
}
