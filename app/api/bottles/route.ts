import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const pageSize = 20
  const keyword = searchParams.get('keyword') || ''
  const offset = (page - 1) * pageSize

  let query = supabaseAdmin
    .from('bottles')
    .select('id, content, content_type, created_at, author:author_id(id, name, avatar, secondme_route)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (keyword) query = query.ilike('content', `%${keyword}%`)

  const { data: items, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bottleIds = (items ?? []).map((item: any) => item.id)
  const chatCountByBottle = new Map<string, number>()
  const messageCountByBottle = new Map<string, number>()

  if (bottleIds.length > 0) {
    const { data: chats } = await supabaseAdmin
      .from('bottle_chats')
      .select('id, bottle_id')
      .in('bottle_id', bottleIds)

    const bottleIdByChatId = new Map<string, string>()
    for (const chat of chats ?? []) {
      bottleIdByChatId.set(chat.id, chat.bottle_id)
      chatCountByBottle.set(chat.bottle_id, (chatCountByBottle.get(chat.bottle_id) ?? 0) + 1)
    }

    const chatIds = Array.from(bottleIdByChatId.keys())
    if (chatIds.length > 0) {
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('chat_id')
        .eq('chat_type', 'bottle')
        .in('chat_id', chatIds)

      for (const message of messages ?? []) {
        const bottleId = bottleIdByChatId.get(message.chat_id)
        if (!bottleId) continue
        messageCountByBottle.set(bottleId, (messageCountByBottle.get(bottleId) ?? 0) + 1)
      }
    }
  }

  const mapped = (items ?? []).map((b: any) => ({
    id: b.id,
    content: b.content,
    contentType: b.content_type,
    createTime: new Date(b.created_at).getTime(),
    user: {
      name: b.author?.name ?? '匿名',
      avatar: b.author?.avatar ?? '',
      route: b.author?.secondme_route ?? '',
    },
    likeCount: Math.min(99, (messageCountByBottle.get(b.id) ?? 0) + (chatCountByBottle.get(b.id) ?? 0) * 2),
    commentCount: chatCountByBottle.get(b.id) ?? 0,
  }))

  return NextResponse.json({
    data: { items: mapped, total: count ?? 0, hasMore: offset + pageSize < (count ?? 0) },
  })
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { content, contentType } = body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: '漂流瓶不能为空' }, { status: 400 })
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: '内容不能超过2000字' }, { status: 400 })
  }

  const validTypes = ['discussion', 'ama', 'info']
  const safeType = validTypes.includes(contentType) ? contentType : 'discussion'

  const { data: bottle, error } = await supabaseAdmin
    .from('bottles')
    .insert({ author_id: me.id, content: content.trim(), content_type: safeType })
    .select('id, content, content_type, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: bottle }, { status: 201 })
}
