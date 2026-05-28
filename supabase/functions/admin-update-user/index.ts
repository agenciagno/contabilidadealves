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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado.");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) throw new Error("Sessão inválida.");

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role, is_super_admin")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile) throw new Error("Perfil não encontrado.");
    if (!profile.is_super_admin && profile.role !== "admin") {
      throw new Error("Apenas administradores podem usar esta função.");
    }

    const { target_user_id, new_email, new_password } = await req.json();

    if (!target_user_id) throw new Error("target_user_id é obrigatório.");
    if (!new_email && !new_password) throw new Error("Informe novo e-mail ou nova senha.");

    const updatePayload: { email?: string; password?: string } = {};
    if (new_email) updatePayload.email = new_email;
    if (new_password) updatePayload.password = new_password;

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      updatePayload
    );
    if (updateErr) throw updateErr;

    if (new_email) {
      await supabaseAdmin
        .from("profiles")
        .update({ email: new_email })
        .eq("user_id", target_user_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Usuário atualizado com sucesso." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
