import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/notifications
export async function GET(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get('unread') === 'true'

  let query = supabaseAdmin
    .from('notifications')
    .select('id, type, related_id, is_read, created_at')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) query = query.eq('is_read', false)

  const { data: notifications, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length
  return NextResponse.json({ notifications, unreadCount })
}

// PUT /api/notifications/read — 批量标为已读
export async function PUT(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ids: string[] = body.ids ?? []

  let query = supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', me.id)

  if (ids.length > 0) {
    query = query.in('id', ids)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
