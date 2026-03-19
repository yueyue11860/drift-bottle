import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getProfile } from '@/lib/secondme'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getProfile(token)
    const { error } = await supabaseAdmin
      .from('users')
      .upsert(
        { secondme_route: profile.originRoute, name: profile.name, avatar: profile.avatar },
        { onConflict: 'secondme_route' }
      )
    if (error) throw error

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, secondme_route, name, avatar')
      .eq('secondme_route', profile.originRoute)
      .single()

    return NextResponse.json({ success: true, user })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'sync failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
