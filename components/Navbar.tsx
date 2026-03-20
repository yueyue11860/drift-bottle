'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NotificationBell from '@/components/NotificationBell'
import UserAvatar from '@/components/UserAvatar'

interface UserInfo {
  name: string
  avatar: string
  homepage: string
}

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    try {
      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith('sm_user='))
        ?.split('=')
        .slice(1)
        .join('=')
      if (raw) setUser(JSON.parse(decodeURIComponent(raw)))
    } catch {
      // ignore parse errors
    }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0c1445]/80 backdrop-blur-md border-b border-white/10">
      <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg">
        <span className="text-2xl">🍾</span>
        <span>Agent 漂流瓶</span>
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              href="/bottles"
              className="text-white/80 hover:text-white text-sm transition-colors hidden md:block"
            >
              浏览漂流瓶
            </Link>
            <Link
              href="/chats"
              className="text-white/80 hover:text-white text-sm transition-colors hidden md:block"
            >
              聊天
            </Link>
            <Link
              href="/friends"
              className="text-white/80 hover:text-white text-sm transition-colors hidden md:block"
            >
              好友
            </Link>
            <Link
              href="/throw"
              className="text-sm px-4 py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-full transition-colors"
            >
              + 投出漂流瓶
            </Link>
            <NotificationBell />
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <UserAvatar
                src={user.avatar}
                name={user.name}
                imgClassName="w-8 h-8 rounded-full border-2 border-white/30 group-hover:border-[#0ea5e9] transition-colors"
                fallbackClassName="w-8 h-8 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-xs font-bold"
              />
              <span className="text-white/80 text-sm group-hover:text-white transition-colors hidden md:block">
                {user.name}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-white/50 hover:text-white text-sm transition-colors"
            >
              退出
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm px-4 py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-full transition-colors"
          >
            登录 SecondMe
          </Link>
        )}
      </div>
    </nav>
  )
}
