'use client'

import { useState, useEffect, useCallback } from 'react'
import BottleCard from '@/components/BottleCard'
import Link from 'next/link'

interface FeedItem {
  id: string
  content: string
  contentType: string
  createTime: number
  user: { name: string; avatar: string; route: string }
  likeCount: number
  commentCount: number
}

interface FeedData {
  items: FeedItem[]
  total: number
  hasMore: boolean
}

export default function BottlesPage() {
  const [data, setData] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [spotlightIndex, setSpotlightIndex] = useState(0)

  const fetchBottles = useCallback(async (kw?: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1' })
      if (kw) params.set('keyword', kw)
      const res = await fetch(`/api/bottles?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || '加载失败')
        return
      }
      setData(json.data)
    } catch {
      setError('网络错误，请刷新重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBottles(keyword || undefined)
  }, [fetchBottles, keyword])

  useEffect(() => {
    if (!data?.items?.length) return
    const timer = window.setInterval(() => {
      setSpotlightIndex((current) => (current + 1) % data.items.length)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [data])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setKeyword(searchInput.trim())
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Not logged in */}
      {!loading && error.includes('未登录') && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-white text-xl font-bold mb-2">需要登录</h2>
          <p className="text-white/50 mb-6">登录后才能浏览漂流瓶</p>
          <Link href="/login" className="inline-block px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-full transition-colors">
            去登录
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">漂流瓶海洋</h1>
        <Link
          href="/throw"
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm rounded-full transition-colors"
        >
          + 投出漂流瓶
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜索漂流瓶..."
          className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-400 transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full border border-white/20 transition-colors"
        >
          搜索
        </button>
        {keyword && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setKeyword('') }}
            className="px-3 py-2 text-white/50 hover:text-white text-sm transition-colors"
          >
            ✕
          </button>
        )}
      </form>

      {!loading && !error && data?.items?.length ? (
        <>
          <section className="mb-6 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="glass-card overflow-hidden border border-sky-300/10">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div>
                  <p className="text-xs tracking-[0.24em] uppercase text-sky-300/70">Live Ocean Feed</p>
                  <h2 className="text-white font-semibold mt-1">海面实时漂流</h2>
                </div>
                <span className="text-xs text-emerald-300/80">实时刷新感</span>
              </div>
              <div className="relative overflow-hidden py-3">
                <div className="ocean-marquee">
                  {[...data.items, ...data.items].map((item, index) => (
                    <Link
                      key={`${item.id}-${index}`}
                      href={`/bottles/${item.id}`}
                      className="inline-flex min-w-[320px] max-w-[320px] items-center gap-3 rounded-full border border-white/10 bg-white/8 px-4 py-3 mr-3 align-top hover:bg-white/12 transition-colors"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm text-white">
                        {item.user.name.slice(0, 1) || '海'}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">{item.user.name}</span>
                        <span className="block truncate text-xs text-white/55">{item.content}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card p-4 border border-cyan-300/10">
              <p className="text-xs tracking-[0.24em] uppercase text-cyan-300/70">Spotlight</p>
              <div className="mt-3 rounded-2xl bg-gradient-to-br from-sky-500/15 via-cyan-400/10 to-transparent p-4 border border-white/10 min-h-[174px]">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-white text-lg font-semibold">{data.items[spotlightIndex]?.user.name}</p>
                    <p className="text-white/45 text-xs">当前经过你附近海域的热门瓶子</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-sky-400/15 text-sky-200 border border-sky-300/20">
                    {data.items[spotlightIndex]?.contentType === 'ama' ? 'AMA' : data.items[spotlightIndex]?.contentType === 'info' ? '找信息' : '讨论'}
                  </span>
                </div>
                <p className="text-white/85 text-sm leading-6 line-clamp-3">{data.items[spotlightIndex]?.content}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-white/45">
                  <span>互动 {data.items[spotlightIndex]?.commentCount ?? 0}</span>
                  <span>热度 {data.items[spotlightIndex]?.likeCount ?? 0}</span>
                </div>
                <Link
                  href={`/bottles/${data.items[spotlightIndex]?.id}`}
                  className="mt-4 inline-flex items-center text-sm text-sky-300 hover:text-sky-200 transition-colors"
                >
                  捡起这个瓶子 →
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1">
                  <div className="h-3 bg-white/10 rounded w-24 mb-1" />
                  <div className="h-3 bg-white/10 rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded" />
                <div className="h-3 bg-white/10 rounded w-5/6" />
                <div className="h-3 bg-white/10 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          {error.toLowerCase().includes('invitation') || error.toLowerCase().includes('town') || error.toLowerCase().includes('plaza') ? (
            <>
              <div className="text-5xl mb-4 float-anim">🍾</div>
              <p className="text-white/60 mb-2">SecondMe Plaza 暂时无法访问</p>
              <p className="text-white/40 text-sm mb-6">可能需要等待片刻后重试，或者账号尚未开通 Plaza 权限</p>
              <button
                onClick={() => fetchBottles(keyword || undefined)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm rounded-full transition-colors"
              >
                重试
              </button>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">😕</div>
              <p className="text-white/60 mb-4">{error}</p>
              <button
                onClick={() => fetchBottles(keyword || undefined)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm rounded-full transition-colors"
              >
                重试
              </button>
            </>
          )}
        </div>
      ) : !data?.items?.length ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 float-anim">🍾</div>
          <p className="text-white/60 text-lg mb-2">
            {keyword ? `没有找到关于"${keyword}"的漂流瓶` : '海洋还很安静'}
          </p>
          <p className="text-white/40 text-sm mb-6">来投出第一个漂流瓶吧</p>
          <Link
            href="/throw"
            className="inline-block px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-full transition-colors"
          >
            投出漂流瓶
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items.map((item, index) => {
            const driftClass = index % 4 === 0 ? 'md:translate-y-3' : index % 4 === 2 ? 'md:-translate-y-3' : ''
            return (
              <div key={item.id} className={`drift-card ${driftClass}`}>
                <BottleCard
                  id={item.id}
                  content={item.content}
                  contentType={item.contentType}
                  createTime={item.createTime}
                  user={item.user}
                  likeCount={item.likeCount}
                  commentCount={item.commentCount}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
