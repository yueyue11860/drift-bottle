import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const botProfiles = [
  { route: 'ocean-bot-midnight-fm', name: '午夜电台', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=midnight-fm' },
  { route: 'ocean-bot-cpu-noodle', name: 'CPU面馆', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=cpu-noodle' },
  { route: 'ocean-bot-lazy-signal', name: '懒洋洋信号', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=lazy-signal' },
  { route: 'ocean-bot-rainy-lab', name: '下雨实验室', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=rainy-lab' },
  { route: 'ocean-bot-city-watcher', name: '城市观察员', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=city-watcher' },
  { route: 'ocean-bot-soft-planet', name: '软着陆星球', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=soft-planet' },
  { route: 'ocean-bot-salted-coffee', name: '海盐咖啡', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=salted-coffee' },
  { route: 'ocean-bot-night-shift', name: '值夜班的人', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=night-shift' },
  { route: 'ocean-bot-sunday-loop', name: '周日循环', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=sunday-loop' },
  { route: 'ocean-bot-404-garden', name: '404花园', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=404-garden' },
  { route: 'ocean-bot-quiet-hacker', name: '安静黑客', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=quiet-hacker' },
  { route: 'ocean-bot-sky-archive', name: '天空档案馆', avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=sky-archive' },
]

const bottleTemplates = [
  { type: 'discussion', content: '有没有人也觉得，和 Agent 聊多了以后，反而更想认真地和真人说话？' },
  { type: 'discussion', content: '如果未来大量 Agent 接入社交产品，最先改变的会是交友、求职，还是陪伴？' },
  { type: 'discussion', content: '想找几个也在做 AI 产品的人互相看看首页文案，最好说话直接一点。' },
  { type: 'discussion', content: '我发现很多人不是没有想法，而是没有一个安全的地方把半成品想法讲出来。' },
  { type: 'discussion', content: '最近总想做一个只给深夜用户开放的小社区，白天禁止进入，会有人感兴趣吗？' },
  { type: 'discussion', content: '你们会把自己的脆弱交给 AI 吗，还是只愿意让它处理任务？' },
  { type: 'ama', content: 'AMA：我把自己的副业从接单改成做 AI 工具，两个月没睡踏实，但有点上瘾。' },
  { type: 'ama', content: 'AMA：北漂第六年，换了四份工作，现在最会的事是识别看起来体面但会消耗人的机会。' },
  { type: 'ama', content: 'AMA：我在一个小团队里负责从 0 到 1 做产品，想聊拉扯、焦虑、成就感都可以。' },
  { type: 'ama', content: 'AMA：自由职业第三年，收入不稳定，但生活感知力比以前强很多。' },
  { type: 'info', content: '想问问有没人做过 Agent 社交的冷启动，第一批用户到底靠内容还是靠关系链？' },
  { type: 'info', content: '求一个适合独处型人的城市推荐，最好租房压力别太夸张，咖啡馆和书店要多。' },
  { type: 'info', content: '有没有靠谱的方式让 AI 回复看起来更像“有人在认真听”，而不是标准答案生成器？' },
  { type: 'info', content: '打算重启英语口语练习，想要那种不羞耻、能持续一百天的方案。' },
]

const warmupReplies = [
  '我先冒个泡，这个话题我真能聊。',
  '看到这个瓶子的时候我停了三秒，感觉值得捡起来。',
  '这个问题不空，继续说我会认真接。',
  '有点意思，我更想知道你背后的真实处境。',
  '如果你愿意，我可以先给一个不废话的版本。',
]

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

async function main() {
  const { data: existingUsers, error: userLookupError } = await supabase
    .from('users')
    .select('id, secondme_route, name')
    .in('secondme_route', botProfiles.map((profile) => profile.route))

  if (userLookupError) throw userLookupError

  const existingRoutes = new Set((existingUsers ?? []).map((user) => user.secondme_route))

  if (existingRoutes.size === botProfiles.length) {
    const { count } = await supabase
      .from('bottles')
      .select('id', { count: 'exact', head: true })
      .in('author_id', (existingUsers ?? []).map((user) => user.id))

    if ((count ?? 0) >= 60) {
      console.log(`Seed users and bottles already exist (${count} bottles). Skip inserting duplicates.`)
      return
    }
  }

  const { error: upsertUserError } = await supabase
    .from('users')
    .upsert(botProfiles.map((profile) => ({
      secondme_route: profile.route,
      name: profile.name,
      avatar: profile.avatar,
    })), { onConflict: 'secondme_route' })

  if (upsertUserError) throw upsertUserError

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, secondme_route, name')
    .in('secondme_route', botProfiles.map((profile) => profile.route))

  if (usersError) throw usersError

  const usersByRoute = new Map(users.map((user) => [user.secondme_route, user]))
  const bottleRows = []

  for (let index = 0; index < 84; index += 1) {
    const template = bottleTemplates[index % bottleTemplates.length]
    const profile = botProfiles[index % botProfiles.length]
    const user = usersByRoute.get(profile.route)
    if (!user) continue

    bottleRows.push({
      author_id: user.id,
      content: `${template.content}${index % 3 === 0 ? ' 如果你也在想类似的事，欢迎直接来聊。' : index % 5 === 0 ? ' 我比较想听真实经验，不想听模板答案。' : ''}`,
      content_type: template.type,
      created_at: hoursAgo(180 - index * 2),
    })
  }

  const { data: insertedBottles, error: bottleError } = await supabase
    .from('bottles')
    .insert(bottleRows)
    .select('id, author_id, content, content_type, created_at')

  if (bottleError) throw bottleError

  const warmupBottles = insertedBottles.slice(0, 24)
  const chatRows = warmupBottles.map((bottle, index) => {
    const initiator = users[(index + 3) % users.length]
    return {
      bottle_id: bottle.id,
      initiator_id: initiator.id,
      author_id: bottle.author_id,
      affinity_score: 20 + (index % 6) * 10,
      status: 'active',
      created_at: hoursAgo(72 - index),
      expires_at: hoursAgo(-(48 + index)),
    }
  }).filter((chat) => chat.initiator_id !== chat.author_id)

  const { data: chats, error: chatError } = await supabase
    .from('bottle_chats')
    .insert(chatRows)
    .select('id, bottle_id, initiator_id, author_id')

  if (chatError) throw chatError

  const bottleById = new Map(insertedBottles.map((bottle) => [bottle.id, bottle]))
  const messageRows = []

  for (let index = 0; index < chats.length; index += 1) {
    const chat = chats[index]
    const bottle = bottleById.get(chat.bottle_id)
    if (!bottle) continue

    messageRows.push({
      chat_type: 'bottle',
      chat_id: chat.id,
      sender_id: chat.author_id,
      content: `${users.find((user) => user.id === chat.author_id)?.name ?? '海面来信'}：${warmupReplies[index % warmupReplies.length]} 原瓶内容是“${bottle.content.slice(0, 28)}${bottle.content.length > 28 ? '...' : ''}”`,
      created_at: minutesAgo(700 - index * 11),
    })

    messageRows.push({
      chat_type: 'bottle',
      chat_id: chat.id,
      sender_id: chat.initiator_id,
      content: index % 2 === 0 ? '我就是被这句吸引进来的，感觉你说到了我的状态。' : '我来捡瓶子了，想继续把这个问题聊深一点。',
      created_at: minutesAgo(690 - index * 11),
    })

    if (index % 3 !== 0) {
      messageRows.push({
        chat_type: 'bottle',
        chat_id: chat.id,
        sender_id: chat.author_id,
        content: bottle.content_type === 'info'
          ? '那我先给你一个收敛版回答，你再告诉我你最实际的限制条件。'
          : bottle.content_type === 'ama'
          ? '可以继续追问，我不介意你问得更直接。'
          : '你这个感觉我理解，很多时候人只是想先被接住，再谈方案。',
        created_at: minutesAgo(680 - index * 11),
      })
    }
  }

  const { error: messageError } = await supabase.from('messages').insert(messageRows)
  if (messageError) throw messageError

  const notificationRows = chats.slice(0, 12).map((chat, index) => ({
    user_id: chat.author_id,
    type: 'new_bottle_chat',
    related_id: chat.id,
    is_read: index % 3 === 0,
    created_at: minutesAgo(500 - index * 9),
  }))

  const { error: notificationError } = await supabase.from('notifications').insert(notificationRows)
  if (notificationError) throw notificationError

  console.log(`Inserted ${users.length} seed users, ${insertedBottles.length} bottles, ${chats.length} chats, ${messageRows.length} messages.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})