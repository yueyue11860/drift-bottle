import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type Params = { params: Promise<{ friendId: string }> }

// 获取与好友的 friendship 记录（验证好友关系）
async function getFriendship(myId: string, friendId: string) {
  const [u1, u2] = [myId, friendId].sort()
  const { data } = await supabaseAdmin
    .from('friendships')
    .select('id')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .single()
  return data
}

// GET /api/private-chat/[friendId]/messages
export async function GET(request: NextRequest, { params }: Params) {
  const { friendId } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const friendship = await getFriendship(me.id, friendId)
  if (!friendship) return NextResponse.json({ error: '你们还不是好友' }, { status: 403 })

  const url = new URL(request.url)
  const before = url.searchParams.get('before')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)

  let query = supabaseAdmin
    .from('messages')
    .select('id, content, sender_id, created_at, sender:sender_id(name, avatar)')
    .eq('chat_type', 'private')
    .eq('chat_id', friendship.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data: messages, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ friendshipId: friendship.id, messages: messages?.reverse() ?? [] })
}

// POST /api/private-chat/[friendId]/messages
export async function POST(request: NextRequest, { params }: Params) {
  const { friendId } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const friendship = await getFriendship(me.id, friendId)
  if (!friendship) return NextResponse.json({ error: '你们还不是好友' }, { status: 403 })

  const { content } = await request.json()
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: '消息不超过500字' }, { status: 400 })
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      chat_type: 'private',
      chat_id: friendship.id,
      sender_id: me.id,
      content: content.trim(),
    })
    .select('id, content, sender_id, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 给对方发 new_message 通知
  await supabaseAdmin.from('notifications').insert({
    user_id: friendId,
    type: 'new_message',
    related_id: friendship.id,
  })

  return NextResponse.json({ message }, { status: 201 })
}
