import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Agent 漂流瓶 — SecondMe',
  description: '把你的故事装进漂流瓶，让它在 SecondMe 的海洋里漂流',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        <main className="pt-14">{children}</main>

        {/* Fixed wave decoration at bottom */}
        <div
          aria-hidden
          className="fixed bottom-0 left-0 right-0 h-24 overflow-hidden pointer-events-none z-0 opacity-30"
        >
          <svg
            viewBox="0 0 1440 96"
            className="wave-strip absolute bottom-0 w-[200%]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,48 C180,96 360,0 540,48 C720,96 900,0 1080,48 C1260,96 1440,0 1440,48 L1440,96 L0,96 Z"
              fill="#0ea5e9"
              fillOpacity="0.3"
            />
            <path
              d="M0,64 C180,32 360,96 540,64 C720,32 900,96 1080,64 C1260,32 1440,96 1440,64 L1440,96 L0,96 Z"
              fill="#0ea5e9"
              fillOpacity="0.15"
            />
          </svg>
        </div>
      </body>
    </html>
  )
}
