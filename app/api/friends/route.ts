import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/friends — 好友列表
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { data: friendships, error } = await supabaseAdmin
    .from('friendships')
    .select(`
      id, created_at,
      user1:user1_id(id, name, avatar, secondme_route),
      user2:user2_id(id, name, avatar, secondme_route)
    `)
    .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 提取好友侧信息
  const friends = (friendships ?? []).map((f: any) => ({
    friendshipId: f.id,
    friend: f.user1.id === me.id ? f.user2 : f.user1,
    since: f.created_at,
  }))

  return NextResponse.json({ friends })
}
