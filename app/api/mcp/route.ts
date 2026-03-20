import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromAccessToken } from '@/lib/auth'
import { buildOceanBotAutoReply, buildOceanBotWelcomeMessage, isOceanBotRoute } from '@/lib/ocean-bot'
import { supabaseAdmin } from '@/lib/supabase'

type JsonRpcId = string | number | null

type JsonRpcRequest = {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: Record<string, unknown>
}

type AppUser = {
  id: string
  secondme_route: string
  name: string
  avatar: string | null
}

type ToolArgs = Record<string, unknown>

const TOOL_DEFINITIONS = [
  {
    name: 'browse_bottles',
    description: '浏览漂流瓶列表，支持分页和关键词搜索。',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', minimum: 1 },
        keyword: { type: 'string' },
      },
    },
  },
  {
    name: 'throw_bottle',
    description: '发布一个新的漂流瓶。',
    inputSchema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 2000 },
        contentType: { type: 'string', enum: ['discussion', 'ama', 'info'] },
      },
    },
  },
  {
    name: 'start_bottle_chat',
    description: '针对指定漂流瓶发起临时聊天，若已存在则返回已有聊天。',
    inputSchema: {
      type: 'object',
      required: ['bottleId'],
      properties: {
        bottleId: { type: 'string' },
      },
    },
  },
  {
    name: 'send_bottle_chat_message',
    description: '向临时聊天发送消息，并返回好感度和可能的自动回复。',
    inputSchema: {
      type: 'object',
      required: ['chatId', 'content'],
      properties: {
        chatId: { type: 'string' },
        content: { type: 'string', minLength: 1, maxLength: 500 },
      },
    },
  },
  {
    name: 'request_friendship',
    description: '当临时聊天好感度达到 100 时，向对方发送好友申请。',
    inputSchema: {
      type: 'object',
      required: ['chatId'],
      properties: {
        chatId: { type: 'string' },
      },
    },
  },
  {
    name: 'list_pending_friend_requests',
    description: '查看当前用户收到的待处理好友申请。',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'respond_friend_request',
    description: '接受或拒绝一条好友申请。',
    inputSchema: {
      type: 'object',
      required: ['requestId', 'action'],
      properties: {
        requestId: { type: 'string' },
        action: { type: 'string', enum: ['accept', 'reject'] },
      },
    },
  },
  {
    name: 'list_friends',
    description: '获取当前用户的好友列表。',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_private_messages',
    description: '读取与指定好友的私聊消息。',
    inputSchema: {
      type: 'object',
      required: ['friendId'],
      properties: {
        friendId: { type: 'string' },
        before: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
    },
  },
  {
    name: 'send_private_message',
    description: '向指定好友发送一条私聊消息。',
    inputSchema: {
      type: 'object',
      required: ['friendId', 'content'],
      properties: {
        friendId: { type: 'string' },
        content: { type: 'string', minLength: 1, maxLength: 500 },
      },
    },
  },
] as const

function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function jsonRpcError(id: JsonRpcId, code: number, message: string, appCode?: string, status = 200) {
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data: appCode ? { appCode } : undefined,
      },
    },
    { status }
  )
}

function okContent(data: unknown, text?: string) {
  return {
    content: [
      ...(text ? [{ type: 'text', text }] : []),
      { type: 'json', json: { ok: true, data } },
    ],
  }
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null
  const [scheme, token] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token.trim()
}

function asPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

async function requireUser(request: NextRequest, id: JsonRpcId) {
  const accessToken = getBearerToken(request)
  if (!accessToken) {
    return {
      error: jsonRpcError(id, -32001, 'Unauthorized', 'UNAUTHORIZED', 401),
      user: null,
    }
  }

  const user = await getCurrentUserFromAccessToken(accessToken)
  if (!user) {
    return {
      error: jsonRpcError(id, -32001, 'Unauthorized', 'UNAUTHORIZED', 401),
      user: null,
    }
  }

  return { error: null, user: user as AppUser }
}

async function browseBottles(_user: AppUser, args: ToolArgs) {
  const page = asPositiveInt(args.page, 1)
  const pageSize = 20
  const keyword = typeof args.keyword === 'string' ? args.keyword.trim() : ''
  const offset = (page - 1) * pageSize

  let query = supabaseAdmin
    .from('bottles')
    .select('id, content, content_type, created_at, author:author_id(id, name, avatar, secondme_route)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (keyword) query = query.ilike('content', `%${keyword}%`)

  const { data: items, count, error } = await query
  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })

  const bottleIds = (items ?? []).map((item: any) => item.id)
  const chatCountByBottle = new Map<string, number>()
  const messageCountByBottle = new Map<string, number>()

  if (bottleIds.length > 0) {
    const { data: chats } = await supabaseAdmin
      .from('bottle_chats')
      .select('id, bottle_id')
      .in('bottle_id', bottleIds)

    const bottleIdByChatId = new Map<string, string>()
    for (const chat of chats ?? []) {
      bottleIdByChatId.set(chat.id, chat.bottle_id)
      chatCountByBottle.set(chat.bottle_id, (chatCountByBottle.get(chat.bottle_id) ?? 0) + 1)
    }

    const chatIds = Array.from(bottleIdByChatId.keys())
    if (chatIds.length > 0) {
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('chat_id')
        .eq('chat_type', 'bottle')
        .in('chat_id', chatIds)

      for (const message of messages ?? []) {
        const bottleId = bottleIdByChatId.get(message.chat_id)
        if (!bottleId) continue
        messageCountByBottle.set(bottleId, (messageCountByBottle.get(bottleId) ?? 0) + 1)
      }
    }
  }

  const mapped = (items ?? []).map((b: any) => ({
    id: b.id,
    content: b.content,
    contentType: b.content_type,
    createTime: new Date(b.created_at).getTime(),
    user: {
      name: b.author?.name ?? '匿名',
      avatar: b.author?.avatar ?? '',
      route: b.author?.secondme_route ?? '',
    },
    likeCount: Math.min(99, (messageCountByBottle.get(b.id) ?? 0) + (chatCountByBottle.get(b.id) ?? 0) * 2),
    commentCount: chatCountByBottle.get(b.id) ?? 0,
  }))

  return {
    items: mapped,
    total: count ?? 0,
    hasMore: offset + pageSize < (count ?? 0),
  }
}

async function throwBottle(user: AppUser, args: ToolArgs) {
  const content = typeof args.content === 'string' ? args.content.trim() : ''
  const contentType = typeof args.contentType === 'string' ? args.contentType : 'discussion'

  if (!content) throw Object.assign(new Error('漂流瓶不能为空'), { appCode: 'INVALID_INPUT' })
  if (content.length > 2000) throw Object.assign(new Error('内容不能超过2000字'), { appCode: 'INVALID_INPUT' })

  const validTypes = ['discussion', 'ama', 'info']
  const safeType = validTypes.includes(contentType) ? contentType : 'discussion'

  const { data: bottle, error } = await supabaseAdmin
    .from('bottles')
    .insert({ author_id: user.id, content, content_type: safeType })
    .select('id, content, content_type, created_at')
    .single()

  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })

  return {
    id: bottle.id,
    content: bottle.content,
    contentType: bottle.content_type,
    createdAt: bottle.created_at,
  }
}

async function startBottleChat(user: AppUser, args: ToolArgs) {
  const bottleId = typeof args.bottleId === 'string' ? args.bottleId : ''
  if (!bottleId) throw Object.assign(new Error('缺少 bottleId'), { appCode: 'INVALID_INPUT' })

  const { data: bottle } = await supabaseAdmin
    .from('bottles')
    .select('id, author_id, content, content_type, author:author_id(id, name, secondme_route)')
    .eq('id', bottleId)
    .single()

  if (!bottle) throw Object.assign(new Error('漂流瓶不存在'), { appCode: 'NOT_FOUND' })
  const bottleRecord = bottle as any

  if (bottleRecord.author_id === user.id) {
    throw Object.assign(new Error('不能和自己的漂流瓶聊天'), { appCode: 'SELF_CHAT_NOT_ALLOWED' })
  }

  const { data: existing } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, status, affinity_score, expires_at')
    .eq('bottle_id', bottleId)
    .eq('initiator_id', user.id)
    .single()

  if (existing) {
    return {
      chatId: existing.id,
      status: existing.status,
      affinityScore: existing.affinity_score,
      expiresAt: existing.expires_at,
      reused: true,
    }
  }

  const { data: chat, error } = await supabaseAdmin
    .from('bottle_chats')
    .insert({
      bottle_id: bottleId,
      initiator_id: user.id,
      author_id: bottleRecord.author_id,
    })
    .select('id, status, affinity_score, expires_at')
    .single()

  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })

  const authorUser = {
    id: bottleRecord.author_id,
    name: bottleRecord.author?.name ?? '海洋来信',
    route: bottleRecord.author?.secondme_route ?? '',
  }

  if (isOceanBotRoute(authorUser.route)) {
    await supabaseAdmin.from('messages').insert({
      chat_type: 'bottle',
      chat_id: chat.id,
      sender_id: authorUser.id,
      content: buildOceanBotWelcomeMessage({
        authorName: authorUser.name,
        authorRoute: authorUser.route,
        contentType: bottleRecord.content_type,
        bottleContent: bottleRecord.content,
      }),
    })
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: authorUser.id,
    type: 'new_bottle_chat',
    related_id: chat.id,
  })

  return {
    chatId: chat.id,
    status: chat.status,
    affinityScore: chat.affinity_score,
    expiresAt: chat.expires_at,
    reused: false,
  }
}

async function sendBottleChatMessage(user: AppUser, args: ToolArgs) {
  const chatId = typeof args.chatId === 'string' ? args.chatId : ''
  const content = typeof args.content === 'string' ? args.content.trim() : ''

  if (!chatId || !content) throw Object.assign(new Error('缺少 chatId 或 content'), { appCode: 'INVALID_INPUT' })
  if (content.length > 500) throw Object.assign(new Error('消息不超过500字'), { appCode: 'INVALID_INPUT' })

  const { data: chat } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, bottle_id, initiator_id, author_id, affinity_score, status, expires_at, author:author_id(id, name, avatar, secondme_route)')
    .eq('id', chatId)
    .single()

  if (!chat) throw Object.assign(new Error('聊天不存在'), { appCode: 'NOT_FOUND' })
  if (chat.initiator_id !== user.id && chat.author_id !== user.id) {
    throw Object.assign(new Error('无权访问'), { appCode: 'FORBIDDEN' })
  }
  if (chat.status === 'expired') throw Object.assign(new Error('该聊天已过期'), { appCode: 'CHAT_EXPIRED' })
  if (chat.status === 'active' && new Date(chat.expires_at) < new Date()) {
    await supabaseAdmin.from('bottle_chats').update({ status: 'expired' }).eq('id', chatId)
    throw Object.assign(new Error('该聊天已过期'), { appCode: 'CHAT_EXPIRED' })
  }

  const { data: message, error: msgErr } = await supabaseAdmin
    .from('messages')
    .insert({ chat_type: 'bottle', chat_id: chatId, sender_id: user.id, content })
    .select('id, content, sender_id, created_at, sender:sender_id(name, avatar)')
    .single()

  if (msgErr) throw Object.assign(new Error(msgErr.message), { appCode: 'INTERNAL_ERROR' })

  const newScore = Math.min(chat.affinity_score + 10, 100)
  await supabaseAdmin.from('bottle_chats').update({ affinity_score: newScore }).eq('id', chatId)

  const otherId = user.id === chat.initiator_id ? chat.author_id : chat.initiator_id
  await supabaseAdmin.from('notifications').insert({
    user_id: otherId,
    type: 'new_message',
    related_id: chatId,
  })

  let autoReply: any = null
  const chatRecord = chat as any
  const author = chatRecord.author as { id: string; name: string; secondme_route?: string } | null

  if (author && author.id !== user.id && isOceanBotRoute(author.secondme_route)) {
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('content, sender_id')
      .eq('chat_type', 'bottle')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(8)

    const { data: bottle } = await supabaseAdmin
      .from('bottles')
      .select('content, content_type')
      .eq('id', chatRecord.bottle_id)
      .single()

    if (bottle) {
      const history = [...(recentMessages ?? []), { content, sender_id: user.id }]
        .slice(-8)
        .map((item) => ({
          sender: item.sender_id === author.id ? 'bot' as const : 'user' as const,
          content: item.content,
        }))

      const replyText = buildOceanBotAutoReply({
        authorName: author.name,
        authorRoute: author.secondme_route,
        contentType: bottle.content_type,
        bottleContent: bottle.content,
        userMessage: content,
        history,
      })

      const { data: insertedReply } = await supabaseAdmin
        .from('messages')
        .insert({
          chat_type: 'bottle',
          chat_id: chatId,
          sender_id: author.id,
          content: replyText,
        })
        .select('id, content, sender_id, created_at, sender:sender_id(name, avatar)')
        .single()

      autoReply = insertedReply
    }
  }

  return {
    message: {
      id: message.id,
      content: message.content,
      senderId: message.sender_id,
      createdAt: message.created_at,
    },
    autoReply,
    affinityScore: newScore,
  }
}

async function getFriendship(myId: string, friendId: string) {
  const [u1, u2] = [myId, friendId].sort()
  const { data } = await supabaseAdmin
    .from('friendships')
    .select('id')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .single()
  return data
}

async function requestFriendship(user: AppUser, args: ToolArgs) {
  const chatId = typeof args.chatId === 'string' ? args.chatId : ''
  if (!chatId) throw Object.assign(new Error('缺少 chatId'), { appCode: 'INVALID_INPUT' })

  const { data: chat } = await supabaseAdmin
    .from('bottle_chats')
    .select('id, initiator_id, author_id, affinity_score, status')
    .eq('id', chatId)
    .single()

  if (!chat) throw Object.assign(new Error('聊天不存在'), { appCode: 'NOT_FOUND' })
  if (chat.initiator_id !== user.id && chat.author_id !== user.id) {
    throw Object.assign(new Error('无权操作'), { appCode: 'FORBIDDEN' })
  }
  if (chat.affinity_score < 100) {
    throw Object.assign(new Error(`好感度不足，当前 ${chat.affinity_score}/100`), { appCode: 'AFFINITY_NOT_ENOUGH' })
  }
  if (chat.status === 'friendship_formed') {
    throw Object.assign(new Error('已经是好友了'), { appCode: 'ALREADY_FRIENDS' })
  }

  const receiverId = user.id === chat.initiator_id ? chat.author_id : chat.initiator_id

  const { data: existing } = await supabaseAdmin
    .from('friend_requests')
    .select('id, status')
    .eq('sender_id', user.id)
    .eq('receiver_id', receiverId)
    .single()

  if (existing) {
    if (existing.status === 'pending') {
      throw Object.assign(new Error('已发送过好友申请'), { appCode: 'REQUEST_ALREADY_SENT' })
    }
    if (existing.status === 'accepted') {
      throw Object.assign(new Error('已经是好友了'), { appCode: 'ALREADY_FRIENDS' })
    }
  }

  const { data: reverseExisting } = await supabaseAdmin
    .from('friend_requests')
    .select('id, status')
    .eq('sender_id', receiverId)
    .eq('receiver_id', user.id)
    .single()

  if (reverseExisting?.status === 'pending') {
    throw Object.assign(new Error('对方已向你发送好友申请，请先处理待处理申请'), {
      appCode: 'REQUEST_ALREADY_PENDING_FROM_OTHER_SIDE',
    })
  }
  if (reverseExisting?.status === 'accepted') {
    throw Object.assign(new Error('已经是好友了'), { appCode: 'ALREADY_FRIENDS' })
  }

  const { data: friendReq, error } = await supabaseAdmin
    .from('friend_requests')
    .insert({ sender_id: user.id, receiver_id: receiverId, bottle_chat_id: chatId })
    .select('id')
    .single()

  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })

  await supabaseAdmin.from('notifications').insert({
    user_id: receiverId,
    type: 'friend_request',
    related_id: friendReq.id,
  })

  return {
    success: true,
    requestId: friendReq.id,
  }
}

async function listPendingFriendRequests(user: AppUser) {
  const { data: requests, error } = await supabaseAdmin
    .from('friend_requests')
    .select('id, status, created_at, bottle_chat_id, sender:sender_id(id, name, avatar)')
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })
  return { requests: requests ?? [] }
}

async function respondFriendRequest(user: AppUser, args: ToolArgs) {
  const requestId = typeof args.requestId === 'string' ? args.requestId : ''
  const action = typeof args.action === 'string' ? args.action : ''

  if (!requestId || !['accept', 'reject'].includes(action)) {
    throw Object.assign(new Error('requestId 或 action 非法'), { appCode: 'INVALID_INPUT' })
  }

  const { data: req } = await supabaseAdmin
    .from('friend_requests')
    .select('id, sender_id, receiver_id, bottle_chat_id, status')
    .eq('id', requestId)
    .single()

  if (!req) throw Object.assign(new Error('申请不存在'), { appCode: 'NOT_FOUND' })
  if (req.receiver_id !== user.id) throw Object.assign(new Error('无权操作'), { appCode: 'FORBIDDEN' })
  if (req.status !== 'pending') throw Object.assign(new Error('申请已处理'), { appCode: 'REQUEST_ALREADY_HANDLED' })

  const newStatus = action === 'accept' ? 'accepted' : 'rejected'
  await supabaseAdmin.from('friend_requests').update({ status: newStatus }).eq('id', requestId)

  let friendshipId: string | null = null

  if (action === 'accept') {
    const [u1, u2] = [req.sender_id, req.receiver_id].sort()
    const { data: friendship } = await supabaseAdmin
      .from('friendships')
      .upsert(
        { user1_id: u1, user2_id: u2, from_bottle_chat_id: req.bottle_chat_id },
        { onConflict: 'user1_id,user2_id' }
      )
      .select('id')
      .single()

    friendshipId = friendship?.id ?? null

    await supabaseAdmin
      .from('bottle_chats')
      .update({ status: 'friendship_formed' })
      .eq('id', req.bottle_chat_id)

    await supabaseAdmin.from('notifications').insert({
      user_id: req.sender_id,
      type: 'friend_accepted',
      related_id: requestId,
    })
  }

  return {
    success: true,
    status: newStatus,
    friendshipId,
  }
}

async function listFriends(user: AppUser) {
  const { data: friendships, error } = await supabaseAdmin
    .from('friendships')
    .select('id, created_at, user1:user1_id(id, name, avatar, secondme_route), user2:user2_id(id, name, avatar, secondme_route)')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })

  const friends = (friendships ?? []).map((f: any) => ({
    friendshipId: f.id,
    friend: f.user1.id === user.id ? f.user2 : f.user1,
    since: f.created_at,
  }))

  return { friends }
}

async function getPrivateMessages(user: AppUser, args: ToolArgs) {
  const friendId = typeof args.friendId === 'string' ? args.friendId : ''
  if (!friendId) throw Object.assign(new Error('缺少 friendId'), { appCode: 'INVALID_INPUT' })

  const friendship = await getFriendship(user.id, friendId)
  if (!friendship) throw Object.assign(new Error('你们还不是好友'), { appCode: 'FORBIDDEN' })

  const before = typeof args.before === 'string' ? args.before : null
  const limit = Math.min(asPositiveInt(args.limit, 50), 100)

  let query = supabaseAdmin
    .from('messages')
    .select('id, content, sender_id, created_at, sender:sender_id(name, avatar)')
    .eq('chat_type', 'private')
    .eq('chat_id', friendship.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data: messages, error } = await query
  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })

  return {
    friendshipId: friendship.id,
    messages: messages?.reverse() ?? [],
  }
}

async function sendPrivateMessage(user: AppUser, args: ToolArgs) {
  const friendId = typeof args.friendId === 'string' ? args.friendId : ''
  const content = typeof args.content === 'string' ? args.content.trim() : ''

  if (!friendId || !content) throw Object.assign(new Error('缺少 friendId 或 content'), { appCode: 'INVALID_INPUT' })
  if (content.length > 500) throw Object.assign(new Error('消息不超过500字'), { appCode: 'INVALID_INPUT' })

  const friendship = await getFriendship(user.id, friendId)
  if (!friendship) throw Object.assign(new Error('你们还不是好友'), { appCode: 'FORBIDDEN' })

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      chat_type: 'private',
      chat_id: friendship.id,
      sender_id: user.id,
      content,
    })
    .select('id, content, sender_id, created_at')
    .single()

  if (error) throw Object.assign(new Error(error.message), { appCode: 'INTERNAL_ERROR' })

  await supabaseAdmin.from('notifications').insert({
    user_id: friendId,
    type: 'new_message',
    related_id: friendship.id,
  })

  return {
    friendshipId: friendship.id,
    message: {
      id: message.id,
      content: message.content,
      senderId: message.sender_id,
      createdAt: message.created_at,
    },
  }
}

const TOOL_HANDLERS: Record<string, (user: AppUser, args: ToolArgs) => Promise<unknown>> = {
  browse_bottles: browseBottles,
  throw_bottle: throwBottle,
  start_bottle_chat: startBottleChat,
  send_bottle_chat_message: sendBottleChatMessage,
  request_friendship: requestFriendship,
  list_pending_friend_requests: (user) => listPendingFriendRequests(user),
  respond_friend_request: respondFriendRequest,
  list_friends: (user) => listFriends(user),
  get_private_messages: getPrivateMessages,
  send_private_message: sendPrivateMessage,
}

export async function GET() {
  return NextResponse.json({ ok: true, name: 'drift-bottle-mcp', version: '0.1.0' })
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null
  const id = body?.id ?? null

  if (!body || body.jsonrpc !== '2.0' || !body.method) {
    return jsonRpcError(id, -32600, 'Invalid Request', 'INVALID_INPUT')
  }

  if (body.method === 'initialize') {
    return jsonRpcResult(id, {
      serverInfo: { name: 'drift-bottle-mcp', version: '0.1.0' },
      capabilities: { tools: true },
    })
  }

  if (body.method === 'tools/list') {
    return jsonRpcResult(id, { tools: TOOL_DEFINITIONS })
  }

  if (body.method === 'tools/call') {
    const auth = await requireUser(request, id)
    if (auth.error) return auth.error

    const name = typeof body.params?.name === 'string' ? body.params.name : ''
    const args = typeof body.params?.arguments === 'object' && body.params.arguments !== null
      ? (body.params.arguments as ToolArgs)
      : {}

    const handler = TOOL_HANDLERS[name]
    if (!handler) {
      return jsonRpcError(id, -32601, 'Tool not found', 'NOT_FOUND')
    }

    try {
      const data = await handler(auth.user, args)
      return jsonRpcResult(id, okContent(data, `工具 ${name} 调用成功`))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error'
      const appCode =
        typeof error === 'object' && error && 'appCode' in error && typeof (error as any).appCode === 'string'
          ? (error as any).appCode
          : 'INTERNAL_ERROR'
      return jsonRpcError(id, -32002, message, appCode)
    }
  }

  return jsonRpcError(id, -32601, 'Method not found', 'NOT_FOUND')
}