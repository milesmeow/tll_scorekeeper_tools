import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client scoped to the caller's JWT — identifies who is calling.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    // Service-role client — bypasses RLS for profile checks + deletion.
    const admin = createClient(supabaseUrl, serviceKey)

    // Caller must be an ACTIVE super_admin.
    const { data: callerProfile, error: callerProfileErr } = await admin
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', caller.id)
      .single()
    if (
      callerProfileErr ||
      !callerProfile ||
      callerProfile.role !== 'super_admin' ||
      !callerProfile.is_active
    ) {
      return json({ error: 'Only super admins can delete users' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const userId = body?.userId
    if (!userId || typeof userId !== 'string') {
      return json({ error: 'userId is required' }, 400)
    }

    if (userId === caller.id) {
      return json({ error: 'You cannot delete your own account' }, 400)
    }

    // Target must exist and must NOT be a super admin.
    const { data: target, error: targetErr } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (targetErr || !target) {
      return json({ error: 'User not found' }, 404)
    }
    if (target.role === 'super_admin') {
      return json({ error: 'Super admin accounts cannot be deleted' }, 403)
    }

    // Hard delete auth user — cascades to user_profiles and team_coaches.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) {
      return json({ error: delErr.message }, 500)
    }

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
