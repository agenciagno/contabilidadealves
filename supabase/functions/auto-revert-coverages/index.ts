// Auto-revert expired collaborator_coverage rows.
// Runs daily via pg_cron. Public endpoint — no auth required.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const today = new Date().toISOString().slice(0, 10);

    const { data: expired, error: e1 } = await supabase
      .from('collaborator_coverage')
      .select('*')
      .eq('is_active', true)
      .lte('end_date', today);

    if (e1) throw e1;

    let reverted = 0;
    let tasksReverted = 0;
    const errors: string[] = [];

    for (const cov of expired ?? []) {
      try {
        const clientIds = (cov.clients_transferred as string[]) ?? [];

        if (clientIds.length > 0) {
          const { data: updatedTasks, error: e2 } = await supabase
            .from('fiscal_tasks')
            .update({ responsible_id: cov.absent_profile_id })
            .eq('responsible_id', cov.covering_profile_id)
            .in('contact_id', clientIds)
            .in('status', ['a_fazer', 'em_progresso', 'aguardando_cliente'])
            .select('id');
          if (e2) throw e2;
          tasksReverted += updatedTasks?.length ?? 0;
        }

        const { error: e3 } = await supabase
          .from('collaborator_coverage')
          .update({ is_active: false, auto_reverted_at: new Date().toISOString() })
          .eq('id', cov.id);
        if (e3) throw e3;

        // Resolve user_ids for both profiles to notify
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, user_id, full_name')
          .in('id', [cov.absent_profile_id, cov.covering_profile_id]);

        const absent = profs?.find((p: any) => p.id === cov.absent_profile_id);
        const covering = profs?.find((p: any) => p.id === cov.covering_profile_id);
        const count = clientIds.length;

        const notifs: any[] = [];
        if (absent?.user_id) {
          notifs.push({
            user_id: absent.user_id,
            company_id: cov.company_id,
            type: 'transfer_end',
            title: 'Cobertura expirada',
            body: `Seus ${count} cliente(s) voltaram automaticamente de ${covering?.full_name ?? 'colaborador'}.`,
            action_url: '/fiscal/colaboradores',
            reference_type: 'coverage',
            reference_id: cov.id,
          });
        }
        if (covering?.user_id) {
          notifs.push({
            user_id: covering.user_id,
            company_id: cov.company_id,
            type: 'transfer_end',
            title: 'Cobertura encerrada',
            body: `${count} cliente(s) de ${absent?.full_name ?? 'colaborador'} foram devolvidos automaticamente.`,
            action_url: '/fiscal/colaboradores',
            reference_type: 'coverage',
            reference_id: cov.id,
          });
        }
        if (notifs.length) {
          await supabase.from('notifications').insert(notifs);
        }
        reverted += 1;
      } catch (err: any) {
        errors.push(`${cov.id}: ${err?.message ?? String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reverted, tasks_reverted: tasksReverted, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
