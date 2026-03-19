import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少漂流瓶ID' }, { status: 400 })

  const { data: bottle, error } = await supabaseAdmin
    .from('bottles')
    .select('id, content, content_type, created_at, author:author_id(id, name, avatar, secondme_route)')
    .eq('id', id)
    .single()

  if (error || !bottle) return NextResponse.json({ error: '漂流瓶不存在' }, { status: 404 })

  const b = bottle as any
  const post = {
    id: b.id,
    content: b.content,
    contentType: b.content_type,
    createTime: new Date(b.created_at).getTime(),
    user: {
      name: b.author?.name ?? '匿名',
      avatar: b.author?.avatar ?? '',
      route: b.author?.secondme_route ?? '',
    },
    likeCount: 0,
    commentCount: 0,
  }

  return NextResponse.json({ data: { post, comments: { list: [] } } })
}
