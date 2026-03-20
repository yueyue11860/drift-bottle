'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/components/UserAvatar'

interface Friend {
  friendshipId: string
  friend: { id: string; name: string; avatar: string | null; secondme_route: string }
  since: string
}

interface FriendRequest {
  id: string
  status: string
  created_at: string
  bottle_chat_id: string
  sender: { id: string; name: string; avatar: string | null }
}

export default function FriendsPage() {
  const router = useRouter()
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [tab, setTab] = useState<'friends' | 'requests'>('friends')
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  const load = () => {
    Promise.all([
      fetch('/api/friends').then((r) => r.json()),
      fetch('/api/friends/request').then((r) => r.json()),
    ])
      .then(([fl, rl]) => {
        if (fl.friends) setFriends(fl.friends)
        if (rl.requests) {
          setRequests(rl.requests)
          if (rl.requests.length > 0) setTab('requests')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/users/sync', { method: 'POST' })
      .then((r) => { if (r.status === 401) router.push('/login') })
      .catch(() => {})
    load()
  }, [router])

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    setActioning(requestId)
    await fetch(`/api/friends/request/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActioning(null)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">👥 好友</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['friends', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              tab === t
                ? 'bg-sky-600 text-white'
                : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
            }`}
          >
            {t === 'friends' ? `好友 (${friends.length})` : `好友申请 ${requests.length > 0 ? `(${requests.length})` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'friends' ? (
        friends.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-sm">还没有好友，去和漂流瓶作者聊天提升好感度吧！</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {friends.map((f) => (
              <li key={f.friendshipId}>
                <Link
                  href={`/friends/${f.friend.id}`}
                  className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-colors block"
                >
                  <UserAvatar
                    src={f.friend.avatar}
                    name={f.friend.name}
                    imgClassName="w-10 h-10 rounded-full border border-white/20 shrink-0"
                    fallbackClassName="w-10 h-10 rounded-full bg-pink-500/40 border border-white/20 shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  />
                  <div className="flex-1">
                    <span className="text-white text-sm font-medium">{f.friend.name}</span>
                    <p className="text-xs text-white/40 mt-0.5">
                      好友 · {new Date(f.since).toLocaleDateString('zh-CN')} 起
                    </p>
                  </div>
                  <span className="text-xs text-sky-400">私聊 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        requests.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <div className="text-4xl mb-3">💌</div>
            <p className="text-sm">暂无好友申请</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => (
              <li key={req.id} className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={req.sender.avatar}
                    name={req.sender.name}
                    imgClassName="w-10 h-10 rounded-full border border-white/20 shrink-0"
                    fallbackClassName="w-10 h-10 rounded-full bg-purple-500/40 border border-white/20 shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  />
                  <div className="flex-1">
                    <span className="text-white text-sm font-medium">{req.sender.name}</span>
                    <p className="text-xs text-white/40 mt-0.5">
                      {new Date(req.created_at).toLocaleDateString('zh-CN')} 发送
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestAction(req.id, 'accept')}
                      disabled={actioning === req.id}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs rounded-full transition-colors"
                    >
                      接受
                    </button>
                    <button
                      onClick={() => handleRequestAction(req.id, 'reject')}
                      disabled={actioning === req.id}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white/70 text-xs rounded-full transition-colors"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
                <Link
                  href={`/chats/${req.bottle_chat_id}`}
                  className="mt-2 text-xs text-sky-400 hover:text-sky-300 transition-colors block"
                >
                  查看来源聊天 →
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
