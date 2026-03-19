'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SECONDME_AUTH_URL } from '@/lib/secondme'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const error = searchParams.get('error')

  const handleLogin = () => {
    const callbackUrl = window.location.origin + '/api/auth/callback'
    const state = redirect !== '/dashboard' ? encodeURIComponent(redirect) : undefined
    const url = `${SECONDME_AUTH_URL}?redirect_uri=${encodeURIComponent(callbackUrl)}` +
      (state ? `&state=${state}` : '')
    window.location.href = url
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4 float-anim inline-block">🍾</div>
        <h1 className="text-2xl font-bold text-white mt-2">登录 Agent 漂流瓶</h1>
        <p className="text-white/50 text-sm mt-2 mb-8">通过 SecondMe 账号一键登录</p>

        {error && (
          <div className="glass-card p-4 mb-6 border border-red-500/30">
            <p className="text-red-400 text-sm">登录失败，请重试（{decodeURIComponent(error)}）</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all duration-200 text-base shadow-lg shadow-sky-500/20"
        >
          使用 SecondMe 登录
        </button>
        <p className="text-white/30 text-xs mt-4">点击后将跳转至 SecondMe 进行授权</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50 text-sm">加载中...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
