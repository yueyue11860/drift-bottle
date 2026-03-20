'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ChatWindow from '@/components/ChatWindow'
import UserAvatar from '@/components/UserAvatar'

interface FriendInfo {
  id: string
  name: string
  avatar: string | null
}

export default function PrivateChatPage() {
  const params = useParams()
  const router = useRouter()
  const friendId = params.friendId as string

  const [friend, setFriend] = useState<FriendInfo | null>(null)
  const [myId, setMyId] = useState('')
  const [friendshipId, setFriendshipId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // 获取我的 user id
    fetch('/api/users/sync', { method: 'POST' })
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then((json) => { if (json?.user?.id) setMyId(json.user.id) })
      .catch(() => {})

    // 获取好友信息 + 验证好友关系（通过拉取消息列表）
    fetch(`/api/private-chat/${friendId}/messages`)
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null }
        if (r.status === 403) { setError('你们还不是好友'); setLoading(false); return null }
        return r.json()
      })
      .then((json) => {
        if (!json) return
        if (json.error) { setError(json.error); return }
        setFriendshipId(json.friendshipId)
      })
      .finally(() => setLoading(false))

    // 获取好友信息（从好友列表查找）
    fetch('/api/friends')
      .then((r) => r.json())
      .then((json) => {
        const found = json.friends?.find((f: any) => f.friend.id === friendId)
        if (found) setFriend(found.friend)
      })
      .catch(() => {})
  }, [friendId, router])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-white/40 text-sm animate-pulse">加载中…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-white/60 mb-4">{error}</p>
        <Link href="/friends" className="text-sky-400 hover:text-sky-300 text-sm transition-colors">
          返回好友列表
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/friends" className="text-white/50 hover:text-white transition-colors">←</Link>
        <UserAvatar
          src={friend?.avatar}
          name={friend?.name}
          imgClassName="w-9 h-9 rounded-full border border-white/20"
          fallbackClassName="w-9 h-9 rounded-full bg-pink-500/40 border border-white/20 flex items-center justify-center text-white text-sm font-bold"
        />
        <div>
          <h1 className="text-white font-semibold text-base">{friend?.name || '好友'}</h1>
          <p className="text-white/40 text-xs">私信聊天</p>
        </div>
      </div>

      {/* Chat window */}
      <div className="glass-card overflow-hidden" style={{ height: '70vh' }}>
        {friendshipId && myId ? (
          <ChatWindow
            chatType="private"
            chatId={friendshipId}
            myUserId={myId}
            fetchUrl={`/api/private-chat/${friendId}/messages`}
            sendUrl={`/api/private-chat/${friendId}/messages`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            加载聊天中…
          </div>
        )}
      </div>
    </div>
  )
}
