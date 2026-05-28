import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) throw new Error("Sessão inválida.");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, is_super_admin, company_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Perfil não encontrado.");
    if (!profile.is_super_admin && profile.role !== "admin") {
      throw new Error("Apenas administradores podem gerenciar acessos.");
    }

    const {
      acesso_id,
      contact_id,
      portal,
      portal_label,
      login,
      senha,
      observacao,
      validade_certificado,
    } = await req.json();

    const secret = Deno.env.get("COFRE_SECRET_KEY");
    if (!secret) throw new Error("COFRE_SECRET_KEY não configurada.");

    const payload: Record<string, unknown> = {
      portal_label: portal_label ?? null,
      login: login ?? null,
      observacao: observacao ?? null,
      validade_certificado: validade_certificado ?? null,
      atualizado_por: profile.id,
      updated_at: new Date().toISOString(),
    };

    if (senha !== undefined && senha !== null && senha !== "") {
      const { data: encrypted, error: encErr } = await supabaseAdmin.rpc(
        "cofre_encrypt_internal",
        { p_plaintext: senha, p_key: secret }
      );
      if (encErr) throw new Error("Falha ao criptografar senha: " + encErr.message);
      payload.senha_encrypted = encrypted;
    }

    let result;

    if (acesso_id) {
      const { data, error } = await supabaseAdmin
        .from("acessos_portais")
        .update(payload)
        .eq("id", acesso_id)
        .eq("company_id", profile.company_id)
        .select("id")
        .single();
      if (error) throw error;
      result = data;
    } else {
      if (!contact_id) throw new Error("contact_id é obrigatório para novo acesso.");
      if (!portal) throw new Error("portal é obrigatório.");

      const { data, error } = await supabaseAdmin
        .from("acessos_portais")
        .insert({ company_id: profile.company_id, contact_id, portal, ...payload })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            `Já existe um acesso para o portal "${portal}" neste cliente. Use acesso_id para atualizar.`
          );
        }
        throw error;
      }
      result = data;
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
