import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// GET /api/realtime-token — 为当前用户颁发 Supabase Realtime JWT
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  if (!jwtSecret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const token = jwt.sign(
    {
      sub: me.id,
      role: 'authenticated',
      iss: 'supabase',
      aud: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
    jwtSecret
  )

  return NextResponse.json({ token, userId: me.id })
}
