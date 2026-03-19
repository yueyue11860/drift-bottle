import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getProfile } from '@/lib/secondme'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // 可选：登录后跳转目标页

  if (!code || !code.startsWith('smc-')) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  try {
    const { accessToken } = await exchangeCode(code)

    let profile = null
    try {
      profile = await getProfile(accessToken)
    } catch {
      // profile 获取失败不阻塞登录
    }

    const redirectTo = state ? decodeURIComponent(state) : '/dashboard'
    const response = NextResponse.redirect(new URL(redirectTo, request.url))

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
