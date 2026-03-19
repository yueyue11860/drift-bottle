'use client'

interface AffinityBarProps {
  score: number
  onRequestFriend?: () => void
  isRequestSent?: boolean
}

export default function AffinityBar({ score, onRequestFriend, isRequestSent }: AffinityBarProps) {
  const pct = Math.min(score, 100)
  const isFull = pct >= 100

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border-b border-white/10">
      <span className="text-xs text-white/50 shrink-0">好感度</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFull ? 'bg-pink-500 shadow-[0_0_8px_#ec4899]' : 'bg-sky-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs shrink-0 ${isFull ? 'text-pink-400 font-bold' : 'text-white/50'}`}>
        {pct}/100
      </span>
      {isFull && onRequestFriend && (
        <button
          onClick={onRequestFriend}
          disabled={isRequestSent}
          className={`shrink-0 text-xs px-3 py-1 rounded-full transition-colors ${
            isRequestSent
              ? 'bg-white/10 text-white/40 cursor-default'
              : 'bg-pink-500 hover:bg-pink-400 text-white animate-pulse'
          }`}
        >
          {isRequestSent ? '申请已发送 ✓' : '💝 申请加好友'}
        </button>
      )}
    </div>
  )
}
