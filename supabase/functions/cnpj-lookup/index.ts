import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    const digits = String(cnpj || '').replace(/\D/g, '');
    if (digits.length !== 14) {
      return new Response(JSON.stringify({ error: 'CNPJ inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!resp.ok) {
      const status = resp.status === 404 ? 404 : 502;
      return new Response(
        JSON.stringify({ error: status === 404 ? 'CNPJ não encontrado' : 'Erro ao consultar CNPJ' }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const d = await resp.json();

    const cep = d.cep ? String(d.cep).replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2') : null;
    const ddd = d.ddd_telefone_1 ? String(d.ddd_telefone_1).replace(/\D/g, '') : '';
    const phone = ddd
      ? ddd.length === 11
        ? ddd.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
        : ddd.length === 10
        ? ddd.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
        : ddd
      : null;

    const cnae_principal = d.cnae_fiscal
      ? { codigo: String(d.cnae_fiscal), descricao: d.cnae_fiscal_descricao || '' }
      : null;
    const cnaes_secundarios = Array.isArray(d.cnaes_secundarios)
      ? d.cnaes_secundarios
          .filter((c: any) => c && c.codigo && String(c.codigo) !== '0')
          .map((c: any) => ({ codigo: String(c.codigo), descricao: c.descricao || '' }))
      : null;

    const result = {
      razao_social: d.razao_social || null,
      nome_fantasia: d.nome_fantasia || null,
      address: d.logradouro || d.descricao_tipo_de_logradouro
        ? [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ').trim() || null
        : null,
      address_number: d.numero || null,
      complemento: d.complemento || null,
      neighborhood: d.bairro || null,
      city: d.municipio || null,
      state: d.uf || null,
      cep,
      phone,
      email: d.email || null,
      cnae_principal,
      cnaes_secundarios,
      natureza_juridica: d.natureza_juridica || null,
      situacao_cadastral: d.descricao_situacao_cadastral || null,
      data_abertura_receita: d.data_inicio_atividade || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
