import { NextRequest, NextResponse } from 'next/server'
import { checkPlazaAccess, redeemInvitationCode } from '@/lib/secondme'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('sm_token')?.value
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })
  try {
    const access = await checkPlazaAccess(token)
    return NextResponse.json({ data: access })
  } catch (err) {
    const message = err instanceof Error ? err.message : '检查权限失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('sm_token')?.value
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })
  try {
    const { code } = await request.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '请输入邀请码' }, { status: 400 })
    }
    const result = await redeemInvitationCode(token, code.trim())
    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : '核销邀请码失败'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
