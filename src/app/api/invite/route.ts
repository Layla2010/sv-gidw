import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server-Konfiguration fehlt.' }, { status: 500 })
    }

    // Eingeloggten User prüfen
    const authHeader = req.headers.get('authorization') ?? ''
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
    }

    // Rollen-Check
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Admin-Berechtigung.' }, { status: 403 })
    }

    const { email, full_name, role, temp_password } = await req.json()
    if (!email || !temp_password) {
      return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich.' }, { status: 400 })
    }

    // Account direkt erstellen (kein E-Mail-Versand)
    const { data, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? '' },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Rolle setzen falls Admin
    if (role === 'admin' && data.user) {
      await adminClient.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
