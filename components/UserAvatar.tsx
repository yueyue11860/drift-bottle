'use client'

import { useState } from 'react'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  /** img 标签的 className */
  imgClassName?: string
  /** 无头像时占位 div 的 className */
  fallbackClassName?: string
}

/** 将 http:// 强制升级为 https:// */
function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://')
}

/**
 * 统一头像组件：
 * - 强制 HTTPS 协议（避免 mixed-content 问题）
 * - referrerPolicy="no-referrer"（绕过 CDN 防盗链）
 * - onError 后自动降级显示首字母头像
 */
export default function UserAvatar({
  src,
  name,
  imgClassName = 'w-8 h-8 rounded-full border border-white/20',
  fallbackClassName = 'w-8 h-8 rounded-full bg-sky-500/40 border border-white/20 flex items-center justify-center text-white text-xs font-bold',
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = name?.[0]?.toUpperCase() || '?'

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={toHttps(src)}
        alt={name || ''}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={imgClassName}
      />
    )
  }

  return <div className={fallbackClassName}>{initial}</div>
}
