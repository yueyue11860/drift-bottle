import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getProfile } from '@/lib/secondme'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    if (!code || typeof code !== 'string' || !code.startsWith('smc-')) {
      return NextResponse.json({ error: '请输入有效的授权码（格式：smc-xxxxx）' }, { status: 400 })
    }

    const tokenData = await exchangeCode(code)
    const { accessToken, tokenType } = tokenData

    // Fetch profile to cache basic user info
    let profile = null
    try {
      profile = await getProfile(accessToken)
    } catch {
      // Profile fetch failure is non-blocking
    }

    const response = NextResponse.json({
      success: true,
      user: profile ? { name: profile.name, avatar: profile.avatar, homepage: profile.homepage } : null,
    })

    // Set httpOnly token cookie (7 days)
    response.cookies.set('sm_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    // Set non-httpOnly user info cookie for client reads
    if (profile) {
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
      // Upsert user into Supabase (non-blocking, fire-and-forget)
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
    const message = err instanceof Error ? err.message : '登录失败，请重试'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
