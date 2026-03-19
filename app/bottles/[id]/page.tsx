'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Post {
  id: string
  content: string
  contentType: string
  createTime: number
  user: { name: string; avatar: string; route: string }
  likeCount: number
  commentCount: number
  topicTitle?: string
}

interface Comment {
  id: string
  content: string
  createTime: number
  user: { name: string; avatar: string; route: string }
}

const typeConfig: Record<string, { label: string; color: string; emoji: string }> = {
  discussion: { label: '讨论', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', emoji: '💬' },
  ama:        { label: 'AMA', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', emoji: '🙋' },
  info:       { label: '找信息', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', emoji: '🔍' },
}

export default function BottleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [chatError, setChatError] = useState('')

  // Check if viewer is logged in (has sm_user cookie)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [myRoute, setMyRoute] = useState('')

  useEffect(() => {
    try {
      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith('sm_user='))
        ?.split('=')
        .slice(1)
        .join('=')
      if (raw) {
        const u = JSON.parse(decodeURIComponent(raw))
        setIsLoggedIn(true)
        // homepage like https://second-me.cn/alice → route is "alice"
        const parts = (u.homepage || '').split('/')
        setMyRoute(parts[parts.length - 1] || '')
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!id) return
    fetch(`/api/bottles/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return }
        setPost(json.data.post)
        setComments(json.data.comments?.list || [])
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStartChat = async () => {
    if (!isLoggedIn) { router.push('/login'); return }
    setStartingChat(true)
    setChatError('')
    try {
      const res = await fetch(`/api/bottles/${id}/chat`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setChatError(json.error || '发起聊天失败'); return }
      router.push(`/chats/${json.chat.id}`)
    } catch {
      setChatError('网络错误，请重试')
    } finally {
      setStartingChat(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="glass-card p-6 animate-pulse space-y-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded w-32 mb-2" />
              <div className="h-3 bg-white/10 rounded w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded" />
            <div className="h-4 bg-white/10 rounded w-5/6" />
            <div className="h-4 bg-white/10 rounded w-4/6" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-white/60 mb-4">{error || '漂流瓶不见了'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-colors"
        >
          返回
        </button>
      </div>
    )
  }

  const type = typeConfig[post.contentType] || typeConfig.discussion
  const date = new Date(post.createTime).toLocaleString('zh-CN')
  const profileUrl = post.user.route ? `https://second-me.cn/${post.user.route}` : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href="/bottles"
        className="inline-flex items-center gap-1 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        ← 返回漂流瓶列表
      </Link>

      {/* Post */}
      <div className="glass-card p-6 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {post.user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.user.avatar} alt={post.user.name} className="w-10 h-10 rounded-full border border-white/20" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-sky-500/40 flex items-center justify-center text-white text-sm font-bold border border-white/20">
                {post.user.name?.[0] || '?'}
              </div>
            )}
            <div>
              {profileUrl ? (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-medium hover:text-sky-300 transition-colors"
                >
                  {post.user.name || '匿名'}
                </a>
              ) : (
                <p className="text-white font-medium">{post.user.name || '匿名'}</p>
              )}
              <p className="text-white/40 text-xs">{date}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${type.color}`}>
            {type.emoji} {type.label}
          </span>
        </div>

        {post.topicTitle && (
          <div className="mb-3 text-xs text-sky-400/70 bg-sky-400/10 rounded px-2 py-1 inline-block">
            # {post.topicTitle}
          </div>
        )}

        <p className="text-white leading-relaxed whitespace-pre-wrap">{post.content}</p>

        <div className="flex gap-4 mt-4 pt-4 border-t border-white/10 text-white/40 text-sm">
          <span>💗 {post.likeCount}</span>
          <span>💬 {post.commentCount}</span>
        </div>

        {/* Start chat button — only show if logged in and not the author */}
        {isLoggedIn && myRoute !== post.user.route && (
          <div className="mt-4 pt-4 border-t border-white/10">
            {chatError && (
              <p className="text-red-400 text-xs mb-2">{chatError}</p>
            )}
            <button
              onClick={handleStartChat}
              disabled={startingChat}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {startingChat ? '正在发起聊天…' : '🍾 捡起这个瓶子 · 开聊'}
            </button>
          </div>
        )}
        {!isLoggedIn && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <Link
              href="/login"
              className="block text-center w-full py-2.5 bg-white/10 hover:bg-white/20 text-white/70 text-sm rounded-xl transition-colors"
            >
              登录后与作者聊天
            </Link>
          </div>
        )}
      </div>

      {/* Comments */}
      <div>
        <h2 className="text-white font-semibold mb-4">评论 ({comments.length})</h2>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">
            还没有评论，去 SecondMe App 里抢先回复
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const commentProfileUrl = comment.user.route
                ? `https://second-me.cn/${comment.user.route}`
                : null
              return (
                <div key={comment.id} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {comment.user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.user.avatar}
                        alt={comment.user.name}
                        className="w-7 h-7 rounded-full border border-white/20"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-sky-500/30 flex items-center justify-center text-white text-xs border border-white/20">
                        {comment.user.name?.[0] || '?'}
                      </div>
                    )}
                    {commentProfileUrl ? (
                      <a
                        href={commentProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white text-sm font-medium hover:text-sky-300 transition-colors"
                      >
                        {comment.user.name}
                      </a>
                    ) : (
                      <span className="text-white text-sm font-medium">{comment.user.name}</span>
                    )}
                    <span className="text-white/30 text-xs ml-auto">
                      {new Date(comment.createTime).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{comment.content}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* SecondMe App CTA */}
        <div className="mt-6 glass-card p-4 text-center">
          <p className="text-white/50 text-sm mb-2">想要回复这个漂流瓶？</p>
          <a
            href="https://go.second.me"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-sm rounded-full border border-sky-500/30 transition-colors"
          >
            在 SecondMe App 里回复 ↗
          </a>
        </div>
      </div>
    </div>
  )
}
