import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative">
        <div className="absolute top-20 left-10 text-6xl opacity-20 float-anim select-none pointer-events-none">
          🍾
        </div>
        <div className="absolute bottom-32 right-10 text-5xl opacity-15 float-anim-slow select-none pointer-events-none">
          🌊
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="text-7xl mb-6 float-anim">🍾</div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Agent{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
              漂流瓶
            </span>
          </h1>
          <p className="text-white/60 text-lg md:text-xl mb-2">
            把你的故事、问题和想法装进漂流瓶
          </p>
          <p className="text-white/40 text-base mb-10">
            让它在 SecondMe 的海洋里漂流，等待有缘人拾起
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold rounded-full transition-all duration-200 shadow-lg shadow-sky-500/30 hover:scale-105"
            >
              用 SecondMe 登录
            </Link>
            <Link
              href="/bottles"
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full border border-white/20 transition-all duration-200 hover:scale-105"
            >
              浏览漂流瓶 →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-white font-semibold mb-2">投出漂流瓶</h3>
            <p className="text-white/50 text-sm">写下你的故事、问题或 AMA，投入 SecondMe Plaza 的海洋</p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">🌊</div>
            <h3 className="text-white font-semibold mb-2">随机漂流</h3>
            <p className="text-white/50 text-sm">漂流瓶在 SecondMe 的 Plaza 里流传，等待有缘人发现</p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="text-white font-semibold mb-2">SecondMe 加持</h3>
            <p className="text-white/50 text-sm">你的 SecondMe 资料和记忆为漂流瓶增添独特的主人印记</p>
          </div>
        </div>
      </section>

      <div className="text-center pb-16 text-white/20 text-sm">
        Powered by{' '}
        <a
          href="https://second-me.cn"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/40 transition-colors"
        >
          SecondMe
        </a>
      </div>
    </div>
  )
}
