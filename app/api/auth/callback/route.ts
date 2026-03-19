import { NextRequest, NextResponse } from 'next/server'
import { exchangeOAuthCode, getProfile } from '@/lib/secondme'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  // 验证 state 防止 CSRF 攻击
  const storedState = request.cookies.get('oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url))
  }

  // 解析真正的跳转目标（state 格式：<random>|<redirect>）
  const [, redirectTarget] = (state ?? '').split('|')
  const redirectTo = redirectTarget ? decodeURIComponent(redirectTarget) : '/dashboard'

  try {
    const redirectUri = new URL('/api/auth/callback', request.url).toString()
    const { accessToken } = await exchangeOAuthCode(code, redirectUri)

    let profile = null
    try {
      profile = await getProfile(accessToken)
    } catch {
      // profile 获取失败不阻塞登录
    }

    const response = NextResponse.redirect(new URL(redirectTo, request.url))
    // 清除 state cookie
    response.cookies.delete('oauth_state')

    // httpOnly token cookie（7天）
    response.cookies.set('sm_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    if (profile) {
      // 客户端可读的用户信息 cookie
      response.cookies.set(
        'sm_user',
        JSON.stringify({ name: profile.name, avatar: profile.avatar, homepage: profile.homepage }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        }
      )

      // 同步用户信息到 Supabase
      if (profile.originRoute) {
        void supabaseAdmin
          .from('users')
          .upsert(
            { secondme_route: profile.originRoute, name: profile.name, avatar: profile.avatar },
            { onConflict: 'secondme_route' }
          )
      }
    }

    return response
  } catch (err) {
    const message = err instanceof Error ? encodeURIComponent(err.message) : 'login_failed'
    return NextResponse.redirect(new URL(`/login?error=${message}`, request.url))
  }
}
