import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

// PUT /api/friends/request/[id] — 接受或拒绝好友申请
export async function PUT(request: NextRequest, { params }: Params) {
  const { id: requestId } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { action } = await request.json()
  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action 必须为 accept 或 reject' }, { status: 400 })
  }

  const { data: req } = await supabaseAdmin
    .from('friend_requests')
    .select('id, sender_id, receiver_id, bottle_chat_id, status')
    .eq('id', requestId)
    .single()

  if (!req) return NextResponse.json({ error: '申请不存在' }, { status: 404 })
  if (req.receiver_id !== me.id) return NextResponse.json({ error: '无权操作' }, { status: 403 })
  if (req.status !== 'pending') return NextResponse.json({ error: '申请已处理' }, { status: 400 })

  const newStatus = action === 'accept' ? 'accepted' : 'rejected'
  await supabaseAdmin.from('friend_requests').update({ status: newStatus }).eq('id', requestId)

  if (action === 'accept') {
    // 创建好友关系（user1_id < user2_id）
    const [u1, u2] = [req.sender_id, req.receiver_id].sort()
    await supabaseAdmin.from('friendships').upsert(
      { user1_id: u1, user2_id: u2, from_bottle_chat_id: req.bottle_chat_id },
      { onConflict: 'user1_id,user2_id' }
    )

    // 更新临时聊天状态
    await supabaseAdmin
      .from('bottle_chats')
      .update({ status: 'friendship_formed' })
      .eq('id', req.bottle_chat_id)

    // 给申请方发通知
    await supabaseAdmin.from('notifications').insert({
      user_id: req.sender_id,
      type: 'friend_accepted',
      related_id: requestId,
    })
  }

  return NextResponse.json({ success: true })
}
