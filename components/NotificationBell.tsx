'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'new_bottle_chat' | 'new_message' | 'friend_request' | 'friend_accepted'
  related_id: string | null
  is_read: boolean
  created_at: string
}

const typeLabel: Record<string, string> = {
  new_bottle_chat: '🍾 有人对你的漂流瓶发起聊天',
  new_message: '💬 收到新消息',
  friend_request: '💝 收到好友申请',
  friend_accepted: '🎉 对方接受了你的好友申请',
}

const typeLink = (n: Notification): string => {
  if (n.type === 'new_bottle_chat' || n.type === 'new_message') return `/chats/${n.related_id}`
  if (n.type === 'friend_request' || n.type === 'friend_accepted') return '/friends'
  return '#'
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((json) => {
        if (json.notifications) {
          setNotifications(json.notifications)
          setUnread(json.unreadCount ?? 0)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markRead = async (ids?: string[]) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids ? { ids } : {}),
    })
    fetchNotifications()
  }

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open && unread > 0) {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
      if (unreadIds.length > 0) markRead(unreadIds)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
        aria-label="通知"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl bg-[#0c1445] border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-medium text-white">通知</span>
              {unread === 0 && notifications.length > 0 && (
                <button
                  onClick={() => markRead()}
                  className="text-xs text-white/40 hover:text-white/80 transition-colors"
                >
                  全部已读
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-sm">暂无通知</div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={typeLink(n)}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                        !n.is_read ? 'bg-sky-900/20' : ''
                      }`}
                    >
                      <span className="mt-0.5 text-sm">{typeLabel[n.type]?.split(' ')[0]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 leading-relaxed">
                          {typeLabel[n.type]?.slice(3)}
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {new Date(n.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
