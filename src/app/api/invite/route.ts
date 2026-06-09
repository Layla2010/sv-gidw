import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server-Konfiguration fehlt.' }, { status: 500 })
    }

    // Eingeloggten User prüfen (anon key + JWT aus Header)
    const authHeader = req.headers.get('authorization') ?? ''
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    // Rollen-Check via Service Role (umgeht RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Admin-Berechtigung.' }, { status: 403 })
    }

    // Einladung versenden
    const { email, full_name, role } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'E-Mail ist erforderlich.' }, { status: 400 })
    }

    const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name ?? '' },
    })
    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    if (role === 'admin' && data.user) {
      await adminClient.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
