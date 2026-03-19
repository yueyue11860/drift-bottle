'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SECONDME_AUTH_URL } from '@/lib/secondme'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // If code arrives via URL fragment (future redirect flow), pre-fill it
  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/code=(smc-[^&]+)/)
    if (match) setCode(match[1])
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SECONDME_AUTH_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: do nothing
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmed = code.trim()
    if (!trimmed.startsWith('smc-')) {
      setError('授权码格式不对，应该是 smc-xxxxx 开头')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || '登录失败，请重试')
        return
      }
      router.push(redirect)
      router.refresh()
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 float-anim inline-block">🍾</div>
          <h1 className="text-2xl font-bold text-white">登录 Agent 漂流瓶</h1>
          <p className="text-white/50 text-sm mt-1">通过 SecondMe 授权码登录</p>
        </div>

        <div className="glass-card p-6 space-y-6">
          {/* Step 1 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                1
              </span>
              <h3 className="text-white font-medium">打开 SecondMe 授权页</h3>
            </div>
            <p className="text-white/50 text-sm mb-3 ml-8">
              点击下方链接，用你的 SecondMe 账号登录并获取授权码
            </p>
            <div className="ml-8 flex items-center gap-2">
              <a
                href={SECONDME_AUTH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sky-400 hover:text-sky-300 text-sm break-all transition-colors bg-white/5 rounded-lg px-3 py-2 border border-white/10"
              >
                {SECONDME_AUTH_URL}
              </a>
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 text-sm transition-colors"
                title="复制链接"
              >
                {copied ? '✓' : '复制'}
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                2
              </span>
              <h3 className="text-white font-medium">粘贴授权码</h3>
            </div>
            <p className="text-white/50 text-sm mb-3 ml-8">
              登录成功后，页面会显示像 <code className="bg-white/10 px-1 rounded text-sky-300">smc-xxxxxxxx</code>{' '}
              这样的授权码，复制并粘贴到下方
            </p>
            <form onSubmit={handleSubmit} className="ml-8 space-y-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="smc-xxxxxxxxxxxxxxxx"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-400 transition-colors"
                autoComplete="off"
                spellCheck={false}
              />
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
              >
                {loading ? '登录中...' : '确认登录'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          授权码 5 分钟有效，单次使用
        </p>
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
