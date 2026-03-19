import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('sm_token')
  response.cookies.delete('sm_user')
  return response
}
