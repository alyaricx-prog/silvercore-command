import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, password, full_name, org_id, group_name } = await req.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const { error: profErr } = await supabaseAdmin.rpc('create_employee_profile', {
    user_id: authData.user.id,
    org_id,
    p_full_name: full_name,
    p_group_name: group_name || 'A',
  })
  if (profErr) return NextResponse.json({ error: 'Auth OK but profile error: ' + profErr.message }, { status: 400 })

  return NextResponse.json({ user: authData.user })
}
