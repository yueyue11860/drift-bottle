'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ChatItem {
  id: string
  bottle_id: string
  affinity_score: number
  status: string
  expires_at: string
  created_at: string
  initiator: { id: string; name: string; avatar: string | null }
  author: { id: string; name: string; avatar: string | null }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return d.toLocaleDateString('zh-CN')
}

export default function ChatsPage() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/sync', { method: 'POST' })
      .then((r) => r.json())
      .then((json) => { if (json.user?.id) setMyId(json.user.id) })
      .catch(() => {})

    fetch('/api/chats')
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then((json) => {
        if (json?.chats) setChats(json.chats)
      })
      .finally(() => setLoading(false))
  }, [router])

  const statusLabel: Record<string, string> = {
    active: '进行中',
    expired: '已过期',
    friendship_formed: '已成好友',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">💬 我的聊天</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm">还没有聊天，去捡几个漂流瓶开聊吧！</p>
          <Link href="/bottles" className="mt-4 inline-block text-sky-400 hover:text-sky-300 text-sm transition-colors">
            浏览漂流瓶 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {chats.map((chat) => {
            const other = chat.initiator.id === myId ? chat.author : chat.initiator
            const isExpired = chat.status === 'expired' || new Date(chat.expires_at) < new Date()
            return (
              <li key={chat.id}>
                <Link
                  href={`/chats/${chat.id}`}
                  className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-colors block"
                >
                  {other.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={other.avatar} alt={other.name} className="w-10 h-10 rounded-full border border-white/20 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sky-500/40 flex items-center justify-center text-white text-sm font-bold border border-white/20 shrink-0">
                      {other.name?.[0] || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{other.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        chat.status === 'friendship_formed'
                          ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                          : isExpired
                          ? 'bg-white/10 text-white/40 border-white/10'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      }`}>
                        {statusLabel[chat.status] || chat.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${chat.affinity_score >= 100 ? 'bg-pink-500' : 'bg-sky-500'}`}
                          style={{ width: `${chat.affinity_score}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 shrink-0">{chat.affinity_score}/100</span>
                    </div>
                  </div>
                  <span className="text-xs text-white/30 shrink-0">{formatTime(chat.created_at)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
