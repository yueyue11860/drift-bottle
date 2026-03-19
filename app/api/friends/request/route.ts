import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/friends/request — 发送好友申请（需要好感度=100）
export async function POST(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { chatId } = await request.json()
  if (!chatId) return NextResponse.json({ error: '缺少 chatId' }, { status: 400 })

  // 验证聊天及好感度
  const { data: chat } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, initiator_id, author_id, affinity_score, status')
    .eq('id', chatId)
    .single()

  if (!chat) return NextResponse.json({ error: '聊天不存在' }, { status: 404 })
  if (chat.initiator_id !== me.id && chat.author_id !== me.id) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }
  if (chat.affinity_score < 100) {
    return NextResponse.json({ error: `好感度不足，当前 ${chat.affinity_score}/100` }, { status: 400 })
  }
  if (chat.status === 'friendship_formed') {
    return NextResponse.json({ error: '已经是好友了' }, { status: 400 })
  }

  const receiverId = me.id === chat.initiator_id ? chat.author_id : chat.initiator_id

  // 检查是否已有好友申请
  const { data: existing } = await supabaseAdmin
    .from('friend_requests')
    .select('id, status')
    .eq('sender_id', me.id)
    .eq('receiver_id', receiverId)
    .single()

  if (existing) {
    if (existing.status === 'pending') return NextResponse.json({ error: '已发送过好友申请' }, { status: 400 })
    if (existing.status === 'accepted') return NextResponse.json({ error: '已经是好友了' }, { status: 400 })
  }

  const { data: friendReq, error } = await supabaseAdmin
    .from('friend_requests')
    .insert({ sender_id: me.id, receiver_id: receiverId, bottle_chat_id: chatId })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 给接收方发通知
  await supabaseAdmin.from('notifications').insert({
    user_id: receiverId,
    type: 'friend_request',
    related_id: friendReq.id,
  })

  return NextResponse.json({ success: true, requestId: friendReq.id }, { status: 201 })
}

// GET /api/friends/request — 收到的好友申请列表
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { data: requests, error } = await supabaseAdmin
    .from('friend_requests')
    .select(`
      id, status, created_at, bottle_chat_id,
      sender:sender_id(id, name, avatar)
    `)
    .eq('receiver_id', me.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests })
}
