import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { getProfile } from '@/lib/secondme'

/**
 * 从 cookie 中获取当前登录用户的 Supabase user 记录
 * 同时确保用户已同步到 Supabase（upsert）
 */
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value
  if (!token) return null

  try {
    const profile = await getProfile(token)
    if (!profile.originRoute) return null

    await supabaseAdmin
      .from('users')
      .upsert(
        { secondme_route: profile.originRoute, name: profile.name, avatar: profile.avatar },
        { onConflict: 'secondme_route' }
      )

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, secondme_route, name, avatar')
      .eq('secondme_route', profile.originRoute)
      .single()

    return user
  } catch {
    return null
  }
}
