import UserAvatar from '@/components/UserAvatar'

interface ProfileCardProps {
  name: string
  avatar: string
  aboutMe: string
  originRoute: string
  homepage: string
}

export default function ProfileCard({ name, avatar, aboutMe, originRoute, homepage }: ProfileCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4">
        <UserAvatar
          src={avatar}
          name={name}
          imgClassName="w-16 h-16 rounded-full border-2 border-sky-400/40 shrink-0"
          fallbackClassName="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-sky-400/40 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-xl font-bold">{name || '未设置名称'}</h2>
          {originRoute && (
            <p className="text-sky-400 text-sm mt-0.5">@{originRoute}</p>
          )}
          {aboutMe && (
            <p className="text-white/70 text-sm mt-2 leading-relaxed">{aboutMe}</p>
          )}
          {homepage && (
            <a
              href={homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-sm mt-2 transition-colors"
            >
              🌐 SecondMe 主页 ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
