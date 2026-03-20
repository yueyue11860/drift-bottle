import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { buildOceanBotAutoReply, isOceanBotRoute } from '@/lib/ocean-bot'

type Params = { params: Promise<{ chatId: string }> }

// GET /api/chats/[chatId]/messages
export async function GET(request: NextRequest, { params }: Params) {
  const { chatId } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  // 验证是否是聊天参与者
  const { data: chat } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, bottle_id, initiator_id, author_id, affinity_score, status, expires_at, initiator:initiator_id(id, name, avatar), author:author_id(id, name, avatar, secondme_route)')
    .eq('id', chatId)
    .single()

  if (!chat) return NextResponse.json({ error: '聊天不存在' }, { status: 404 })
  if (chat.initiator_id !== me.id && chat.author_id !== me.id) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  const url = new URL(request.url)
  const before = url.searchParams.get('before')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)

  let query = supabaseAdmin
    .from('messages')
    .select('id, content, sender_id, created_at, sender:sender_id(name, avatar)')
    .eq('chat_type', 'bottle')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data: messages, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ chat, messages: messages?.reverse() ?? [] })
}

// POST /api/chats/[chatId]/messages — 发送消息，同时更新好感度
export async function POST(request: NextRequest, { params }: Params) {
  const { chatId } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { content } = await request.json()
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: '消息不超过500字' }, { status: 400 })
  }

  // 验证聊天
  const { data: chat } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, bottle_id, initiator_id, author_id, affinity_score, status, expires_at, author:author_id(id, name, avatar, secondme_route)')
    .eq('id', chatId)
    .single()

  if (!chat) return NextResponse.json({ error: '聊天不存在' }, { status: 404 })
  if (chat.initiator_id !== me.id && chat.author_id !== me.id) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }
  if (chat.status === 'expired') {
    return NextResponse.json({ error: '该聊天已过期' }, { status: 400 })
  }
  if (chat.status === 'active' && new Date(chat.expires_at) < new Date()) {
    // 标记过期
    await supabaseAdmin.from('bottle_chats').update({ status: 'expired' }).eq('id', chatId)
    return NextResponse.json({ error: '该聊天已过期' }, { status: 400 })
  }

  // 写入消息
  const { data: message, error: msgErr } = await supabaseAdmin
    .from('messages')
    .insert({ chat_type: 'bottle', chat_id: chatId, sender_id: me.id, content: content.trim() })
    .select('id, content, sender_id, created_at, sender:sender_id(name, avatar)')
    .single()

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // 好感度 +10（最多100）
  const newScore = Math.min(chat.affinity_score + 10, 100)
  await supabaseAdmin
    .from('bottle_chats')
    .update({ affinity_score: newScore })
    .eq('id', chatId)

  // 给对方发 new_message 通知
  const otherId = me.id === chat.initiator_id ? chat.author_id : chat.initiator_id
  await supabaseAdmin.from('notifications').insert({
    user_id: otherId,
    type: 'new_message',
    related_id: chatId,
  })

  let autoReply: any = null
  const chatRecord = chat as any
  const author = chatRecord.author as { id: string; name: string; secondme_route?: string } | null

  if (author && author.id !== me.id && isOceanBotRoute(author.secondme_route)) {
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('content, sender_id')
      .eq('chat_type', 'bottle')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(8)

    const { data: bottle } = await supabaseAdmin
      .from('bottles')
      .select('content, content_type')
      .eq('id', chatRecord.bottle_id)
      .single()

    if (bottle) {
      const history = [...(recentMessages ?? []), { content: content.trim(), sender_id: me.id }]
        .slice(-8)
        .map((item) => ({
          sender: item.sender_id === author.id ? 'bot' as const : 'user' as const,
          content: item.content,
        }))

      const replyText = buildOceanBotAutoReply({
        authorName: author.name,
        authorRoute: author.secondme_route,
        contentType: bottle.content_type,
        bottleContent: bottle.content,
        userMessage: content.trim(),
        history,
      })

      const { data: insertedReply } = await supabaseAdmin
        .from('messages')
        .insert({
          chat_type: 'bottle',
          chat_id: chatId,
          sender_id: author.id,
          content: replyText,
        })
        .select('id, content, sender_id, created_at, sender:sender_id(name, avatar)')
        .single()

      autoReply = insertedReply
    }
  }

  return NextResponse.json({ message, autoReply, affinityScore: newScore }, { status: 201 })
}
