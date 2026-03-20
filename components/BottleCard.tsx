import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'

interface BottleCardProps {
  id: string
  content: string
  contentType: string
  createTime: number
  user: {
    name: string
    avatar: string
    route: string
  }
  likeCount?: number
  commentCount?: number
}

const typeConfig: Record<string, { label: string; color: string; emoji: string }> = {
  discussion: { label: '讨论', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', emoji: '💬' },
  ama:        { label: 'AMA', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', emoji: '🙋' },
  info:       { label: '找信息', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', emoji: '🔍' },
}

export default function BottleCard({
  id,
  content,
  contentType,
  createTime,
  user,
  likeCount = 0,
  commentCount = 0,
}: BottleCardProps) {
  const type = typeConfig[contentType] || typeConfig.discussion
  const date = new Date(createTime).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Link href={`/bottles/${id}`} className="block group">
      <div className="glass-card p-5 hover:bg-white/15 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-sky-500/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserAvatar
              src={user.avatar}
              name={user.name}
              imgClassName="w-8 h-8 rounded-full border border-white/20"
              fallbackClassName="w-8 h-8 rounded-full bg-sky-500/40 border border-white/20 flex items-center justify-center text-white text-xs font-bold"
            />
            <div>
              <p className="text-white text-sm font-medium leading-none">{user.name || '匿名'}</p>
              <p className="text-white/40 text-xs mt-0.5">{date}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${type.color}`}>
            {type.emoji} {type.label}
          </span>
        </div>

        {/* Content */}
        <p className="text-white/80 text-sm leading-relaxed line-clamp-3">{content}</p>

        {/* Footer */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-white/40 text-xs">
          <span>💗 {likeCount}</span>
          <span>💬 {commentCount}</span>
          <span className="ml-auto text-sky-400/70 group-hover:text-sky-400 transition-colors">
            查看详情 →
          </span>
        </div>
      </div>
    </Link>
  )
}
