import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, bottle_id, affinity_score, status, expires_at, created_at, initiator:initiator_id(id, name, avatar), author:author_id(id, name, avatar)')
    .or(`initiator_id.eq.${me.id},author_id.eq.${me.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ chats: data ?? [] })
}