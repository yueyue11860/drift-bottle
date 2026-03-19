'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ContentType = 'discussion' | 'ama' | 'info'

const typeOptions: { value: ContentType; label: string; emoji: string; desc: string }[] = [
  { value: 'discussion', label: '讨论', emoji: '💬', desc: '分享观点、聊天、讨论任何话题' },
  { value: 'ama',        label: 'AMA',  emoji: '🙋', desc: '让大家向你提问，介绍自己' },
  { value: 'info',       label: '找信息', emoji: '🔍', desc: '寻求建议、资源或实用信息' },
]

export default function ThrowPage() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<ContentType>('discussion')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const maxLen = 2000
  const remaining = maxLen - content.length

  const handleSubmit = async () => {
    if (!content.trim()) { setError('漂流瓶内容不能为空'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/bottles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), contentType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '发布失败，请重试')
        return
      }
      setSuccess(true)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4 float-anim">🍾</div>
        <h2 className="text-white text-2xl font-bold mb-2">漂流瓶已投出！</h2>
        <p className="text-white/60 mb-8">它正在漂流瓶海洋里漂荡，等待有缘人拾起</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/bottles"
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-full transition-colors"
          >
            浏览漂流瓶
          </Link>
          <button
            onClick={() => { setContent(''); setPreview(false); setSuccess(false) }}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-colors"
          >
            再投一个
          </button>
        </div>
      </div>
    )
  }

  const selectedType = typeOptions.find((t) => t.value === contentType)!

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors text-sm">
          ← 返回
        </Link>
        <h1 className="text-2xl font-bold text-white">投出漂流瓶</h1>
      </div>

      {!preview ? (
        <div className="glass-card p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">漂流瓶类型</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setContentType(opt.value)}
                  className={`p-3 rounded-lg border text-sm transition-all ${
                    contentType === opt.value
                      ? 'bg-sky-500/20 border-sky-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="text-xl mb-1">{opt.emoji}</div>
                  <div className="font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">{selectedType.desc}</p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                contentType === 'ama'
                  ? '介绍一下你自己，邀请大家向你提问...'
                  : contentType === 'info'
                  ? '你想找什么信息？需要什么帮助？'
                  : '写下你想说的话，装进漂流瓶...'
              }
              rows={8}
              maxLength={maxLen}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-400 transition-colors resize-none"
            />
            <div className={`text-xs text-right mt-1 ${remaining < 100 ? 'text-amber-400' : 'text-white/30'}`}>
              剩余 {remaining} 字
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!content.trim()}
              onClick={() => setPreview(true)}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-medium rounded-lg border border-white/20 transition-colors"
            >
              预览
            </button>
            <button
              type="button"
              disabled={loading || !content.trim()}
              onClick={handleSubmit}
              className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
            >
              {loading ? '投出中...' : '🍾 投出漂流瓶'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/50 text-sm">预览</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                contentType === 'discussion' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                contentType === 'ama' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {selectedType.emoji} {selectedType.label}
              </span>
            </div>
            <p className="text-white leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg border border-white/20 transition-colors"
            >
              继续编辑
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
            >
              {loading ? '投出中...' : '确认投出 🍾'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
