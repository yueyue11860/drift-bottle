import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { buildOceanBotWelcomeMessage, isOceanBotRoute } from '@/lib/ocean-bot'

// POST /api/bottles/[id]/chat — 发起临时聊天
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bottleId } = await params

  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  // 从 Supabase 获取漂流瓶及作者信息
  const { data: bottle } = await supabaseAdmin
    .from('bottles')
    .select('id, author_id, content, content_type, author:author_id(id, name, secondme_route)')
    .eq('id', bottleId)
    .single()

  if (!bottle) return NextResponse.json({ error: '漂流瓶不存在' }, { status: 404 })

  const bottleRecord = bottle as any

  // 不能和自己聊天
  if (bottleRecord.author_id === me.id) {
    return NextResponse.json({ error: '不能和自己的漂流瓶聊天' }, { status: 400 })
  }

  const authorUser = {
    id: bottleRecord.author_id,
    name: bottleRecord.author?.name ?? '海洋来信',
    route: bottleRecord.author?.secondme_route ?? '',
  }

  // 查找已有聊天
  const { data: existing } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, status, affinity_score, expires_at')
    .eq('bottle_id', bottleId)
    .eq('initiator_id', me.id)
    .single()

  if (existing) {
    return NextResponse.json({ chat: existing })
  }

  // 创建新聊天
  const { data: chat, error } = await supabaseAdmin
    .from('bottle_chats')
    .insert({
      bottle_id: bottleId,
      initiator_id: me.id,
      author_id: authorUser.id,
    })
    .select('id, status, affinity_score, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (isOceanBotRoute(authorUser.route)) {
    await supabaseAdmin.from('messages').insert({
      chat_type: 'bottle',
      chat_id: chat.id,
      sender_id: authorUser.id,
      content: buildOceanBotWelcomeMessage({
        authorName: authorUser.name,
        authorRoute: authorUser.route,
        contentType: bottleRecord.content_type,
        bottleContent: bottleRecord.content,
      }),
    })
  }

  // 给作者发通知
  await supabaseAdmin.from('notifications').insert({
    user_id: authorUser.id,
    type: 'new_bottle_chat',
    related_id: chat.id,
  })

  return NextResponse.json({ chat }, { status: 201 })
}
