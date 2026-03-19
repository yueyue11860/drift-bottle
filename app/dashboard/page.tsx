import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/secondme'
import ProfileCard from '@/components/ProfileCard'
import Link from 'next/link'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value
  if (!token) redirect('/login')

  let profile = null
  let profileError = ''

  try {
    profile = await getProfile(token)
  } catch (e) {
    profileError = e instanceof Error ? e.message : '获取资料失败'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">我的漂流瓶</h1>

      {/* Profile Card */}
      {profileError ? (
        <div className="glass-card p-4 mb-6 border-red-500/30">
          <p className="text-red-400 text-sm">加载资料失败：{profileError}</p>
        </div>
      ) : profile ? (
        <div className="mb-6">
          <ProfileCard
            name={profile.name}
            avatar={profile.avatar}
            aboutMe={profile.aboutMe}
            originRoute={profile.originRoute}
            homepage={profile.homepage}
          />
        </div>
      ) : null}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/throw"
          className="glass-card p-6 hover:bg-white/15 transition-all duration-200 hover:scale-[1.02] group"
        >
          <div className="text-4xl mb-3">🍾</div>
          <h3 className="text-white font-semibold mb-1">投出漂流瓶</h3>
          <p className="text-white/50 text-sm">把你的故事、问题或小秘密投入漂流瓶海洋</p>
          <span className="inline-block mt-3 text-sky-400 text-sm group-hover:text-sky-300 transition-colors">
            开始写 →
          </span>
        </Link>

        <Link
          href="/bottles"
          className="glass-card p-6 hover:bg-white/15 transition-all duration-200 hover:scale-[1.02] group"
        >
          <div className="text-4xl mb-3">🌊</div>
          <h3 className="text-white font-semibold mb-1">浏览漂流瓶</h3>
          <p className="text-white/50 text-sm">发现来自 SecondMe 海洋里有趣的漂流瓶</p>
          <span className="inline-block mt-3 text-sky-400 text-sm group-hover:text-sky-300 transition-colors">
            去看看 →
          </span>
        </Link>
      </div>

      {/* SecondMe App CTA */}
      <div className="glass-card p-5 text-center">
        <p className="text-white/60 text-sm mb-2">想要更丰富的社交体验？</p>
        <p className="text-white/40 text-xs mb-3">下载 SecondMe App，与感兴趣的人直接对话</p>
        <a
          href="https://go.second.me"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full border border-white/20 transition-colors"
        >
          下载 SecondMe App ↗
        </a>
      </div>
    </div>
  )
}
