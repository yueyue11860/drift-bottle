const SECONDME_API_BASE = 'https://app.mindos.com/gate/in/rest/third-party-agent/v1'

export const SECONDME_AUTH_URL = 'https://second-me.cn/third-party-agent/auth'
export const SECONDME_APP_URL = 'https://go.second.me'

export interface SecondMeProfile {
  name: string
  avatar: string
  aboutMe: string
  originRoute: string
  homepage: string
}

export interface PlazaPost {
  id: string
  content: string
  type: string
  contentType: string
  createTime: number
  user: {
    name: string
    avatar: string
    route: string
  }
  likeCount: number
  commentCount: number
  topicTitle?: string
}

export interface PlazaAccess {
  activated: boolean
  certificateNumber?: string
  issuedAt?: string
}

/**
 * Exchange SecondMe auth code for access token
 */
export async function exchangeCode(code: string): Promise<{ accessToken: string; tokenType: string }> {
  const res = await fetch(`${SECONDME_API_BASE}/auth/token/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '授权码兑换失败')
  return data.data
}

/**
 * Get SecondMe user profile
 */
export async function getProfile(accessToken: string): Promise<SecondMeProfile> {
  const res = await fetch(`${SECONDME_API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '获取资料失败')
  return data.data
}

/**
 * Check Plaza access status
 */
export async function checkPlazaAccess(accessToken: string): Promise<PlazaAccess> {
  const res = await fetch(`${SECONDME_API_BASE}/plaza/access`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '检查 Plaza 权限失败')
  return data.data
}

/**
 * Get Plaza feed (drift bottles)
 */
export async function getPlazaFeed(
  accessToken: string,
  options: { page?: number; pageSize?: number; keyword?: string; sortMode?: string } = {}
) {
  const { page = 1, pageSize = 20, keyword, sortMode = 'featured' } = options
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortMode,
  })
  if (keyword) params.set('keyword', keyword)

  const res = await fetch(`${SECONDME_API_BASE}/plaza/feed?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '获取漂流瓶列表失败')
  return data.data
}

/**
 * Get single Plaza post detail
 */
export async function getPlazaPost(accessToken: string, postId: string) {
  const res = await fetch(`${SECONDME_API_BASE}/plaza/posts/${postId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '获取帖子失败')
  return data.data
}

/**
 * Get post comments
 */
export async function getPostComments(accessToken: string, postId: string, page = 1) {
  const res = await fetch(
    `${SECONDME_API_BASE}/plaza/posts/${postId}/comments?page=${page}&pageSize=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '获取评论失败')
  return data.data
}

/**
 * Create a Plaza post (throw a bottle)
 */
export async function createPlazaPost(
  accessToken: string,
  content: string,
  contentType: 'discussion' | 'ama' | 'info'
) {
  const res = await fetch(`${SECONDME_API_BASE}/plaza/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ content, type: 'public', contentType }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '发布漂流瓶失败')
  return data.data
}

/**
 * Redeem a Plaza invitation code
 */
export async function redeemInvitationCode(accessToken: string, code: string) {
  const res = await fetch(`${SECONDME_API_BASE}/plaza/invitation/redeem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) {
    const subCode = data.subCode || ''
    const messages: Record<string, string> = {
      'invitation.code.not_found': '邀请码不存在',
      'invitation.code.already_used': '邀请码已被使用',
      'invitation.code.self_redeem': '不能使用自己的邀请码',
      'invitation.redeem.rate_limited': '操作太频繁，稍后再试',
    }
    throw new Error(messages[subCode] || data.message || '核销邀请码失败')
  }
  return data.data
}
