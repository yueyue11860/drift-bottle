import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/secondme'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('sm_token')?.value
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  try {
    const profile = await getProfile(token)
    return NextResponse.json({ data: profile })
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取资料失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
