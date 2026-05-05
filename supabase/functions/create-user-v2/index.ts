import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerUserId = claimsData.claims.sub;

    const { data: callerProfile, error: profileError } = await anonClient
      .from('profiles')
      .select('is_super_admin, role')
      .eq('user_id', callerUserId)
      .single();

    const isCallerAdmin = callerProfile?.is_super_admin || 
      callerProfile?.role === 'super_admin' || 
      callerProfile?.role === 'admin';

    if (profileError || !isCallerAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { 
      userId, email, password, fullName, companyId, 
      allowedModules = ['financeiro', 'crm'], 
      role = 'colaborador',
      statusActive = true,
      forcePasswordChange = true,
    } = body;

    // ─── UPDATE MODE ───────────────────────────────────────────────
    if (userId) {
      const profileUpdate: Record<string, unknown> = {
        full_name: fullName,
        allowed_modules: allowedModules,
        role,
        status_active: statusActive,
        is_super_admin: role === 'super_admin',
      };

      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', userId);

      if (updateProfileError) {
        return new Response(JSON.stringify({ error: updateProfileError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (password) {
        const { error: passwordError } = await adminClient.auth.admin.updateUserById(userId, { password });
        if (passwordError) {
          return new Response(JSON.stringify({ error: passwordError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, userId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── CREATE MODE ───────────────────────────────────────────────
    if (!email || !password || !fullName || !companyId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, fullName, companyId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_id: companyId,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = authData.user.id;

    const profileData: Record<string, unknown> = {
      user_id: newUserId,
      company_id: companyId,
      full_name: fullName,
      email: email,
      is_super_admin: role === 'super_admin',
      allowed_modules: allowedModules,
      role,
      status_active: statusActive,
      force_password_change: forcePasswordChange,
      status: 'active',
      password_changed_at: null,
    };

    const { error: profileInsertError } = await adminClient
      .from('profiles')
      .insert(profileData);

    if (profileInsertError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: profileInsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: role === 'super_admin' ? 'admin' : role === 'admin' ? 'admin' : 'colaborador',
      });

    if (roleError) {
      console.error('Warning: Could not insert user role:', roleError.message);
    }

    return new Response(JSON.stringify({ success: true, userId: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
