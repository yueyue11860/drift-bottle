'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ChatWindow from '@/components/ChatWindow'
import AffinityBar from '@/components/AffinityBar'

interface Chat {
  id: string
  bottle_id: string
  affinity_score: number
  status: 'active' | 'expired' | 'friendship_formed'
  expires_at: string
  initiator: { id: string; name: string; avatar: string | null }
  author: { id: string; name: string; avatar: string | null }
}

function getMyUserId(): string {
  if (typeof document === 'undefined') return ''
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith('sm_user_id='))
      ?.split('=')
      .slice(1)
      .join('=')
    return raw ? decodeURIComponent(raw) : ''
  } catch { return '' }
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [myId, setMyId] = useState('')
  const [affinityScore, setAffinityScore] = useState(0)
  const [requestSent, setRequestSent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [friendError, setFriendError] = useState('')

  // 从 API 获取 chat + myId
  useEffect(() => {
    fetch(`/api/chats/${chatId}/messages`)
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then((json) => {
        if (!json) return
        if (json.error) { router.push('/chats'); return }
        setChat(json.chat)
        setAffinityScore(json.chat.affinity_score)
      })
      .finally(() => setLoading(false))

    // 获取我的Supabase user id
    fetch('/api/users/sync', { method: 'POST' })
      .then((r) => r.json())
      .then((json) => { if (json.user?.id) setMyId(json.user.id) })
      .catch(() => {})
  }, [chatId, router])

  const handleAffinityChange = useCallback((score: number) => {
    setAffinityScore(score)
  }, [])

  const handleRequestFriend = async () => {
    setFriendError('')
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    })
    const json = await res.json()
    if (!res.ok) { setFriendError(json.error || '发送失败'); return }
    setRequestSent(true)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-white/40 text-sm animate-pulse">加载中…</div>
      </div>
    )
  }

  if (!chat) return null

  const isExpired = chat.status === 'expired' || new Date(chat.expires_at) < new Date()
  const isFriendship = chat.status === 'friendship_formed'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/chats" className="text-white/50 hover:text-white transition-colors">←</Link>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-base">
            {isFriendship ? '🍾 漂流瓶 · 已成为好友' : '🍾 漂流瓶临时聊天'}
          </h1>
          <p className="text-white/40 text-xs">
            {isExpired
              ? '该聊天已过期'
              : isFriendship
              ? '好友关系建立！可前往私聊'
              : `有效期至 ${new Date(chat.expires_at).toLocaleDateString('zh-CN')}`}
          </p>
        </div>
        <Link href={`/bottles/${chat.bottle_id}`} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
          查看漂流瓶 →
        </Link>
      </div>

      {/* 好友关系建立后提示跳转私聊 */}
      {isFriendship && (
        <div className="glass-card p-4 mb-4 text-center">
          <p className="text-white/80 text-sm mb-3">🎉 好友关系已建立！</p>
          <Link
            href={`/friends/${myId === chat.initiator.id ? chat.author.id : chat.initiator.id}`}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-full transition-colors"
          >
            前往私聊 →
          </Link>
        </div>
      )}

      {/* Chat window */}
      <div className="glass-card overflow-hidden flex flex-col" style={{ height: '65vh' }}>
        {/* Affinity bar (only for active bottle chats) */}
        {!isFriendship && (
          <AffinityBar
            score={affinityScore}
            onRequestFriend={handleRequestFriend}
            isRequestSent={requestSent}
          />
        )}

        {friendError && (
          <div className="px-4 py-2 bg-red-500/20 text-red-300 text-xs text-center">{friendError}</div>
        )}

        {isExpired ? (
          <div className="flex-1 flex items-center justify-center h-full text-white/40 text-sm">
            该聊天已过期，无法发送新消息
          </div>
        ) : (
          <ChatWindow
            chatType="bottle"
            chatId={chatId}
            myUserId={myId}
            fetchUrl={`/api/chats/${chatId}/messages`}
            sendUrl={`/api/chats/${chatId}/messages`}
            onAffinityChange={handleAffinityChange}
          />
        )}
      </div>
    </div>
  )
}
