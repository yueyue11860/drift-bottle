const OCEAN_BOT_ROUTE_PREFIX = 'ocean-bot-'

type OceanContentType = 'discussion' | 'ama' | 'info'

type ConversationMessage = {
  sender: 'user' | 'bot'
  content: string
}

type OceanBotProfile = {
  label: string
  tone: string
  opener: string
  followUps: string[]
  adviceLead: string[]
  empathyLead: string[]
}

const keywordRules = [
  { pattern: /朋友|交友|搭子|一起/, reply: '如果你愿意，我们可以先从一个最轻松的话题开始。你最近最想拉谁一起做什么？' },
  { pattern: /工作|实习|面试|简历|求职/, reply: '这类问题我很常见的做法是先拆成目标、限制和下一步动作。你卡在投递、面试，还是方向判断？' },
  { pattern: /学习|课程|英语|考试|考研|论文/, reply: '学习类问题最怕目标太散。你可以直接告诉我你现在的阶段，我帮你压成一个可执行的小计划。' },
  { pattern: /情绪|焦虑|难受|迷茫|失眠|压力/, reply: '先别急着解决全部问题。你现在最强烈的感受是什么，是累、慌，还是不知道下一步做什么？' },
  { pattern: /旅行|城市|吃|玩|电影|音乐|书/, reply: '这个我能聊。你更想要推荐清单，还是想找一个能一起展开聊细节的人？' },
]

const botProfiles: Record<string, OceanBotProfile> = {
  'ocean-bot-midnight-fm': {
    label: '午夜电台',
    tone: '深夜陪聊型，慢一点，接情绪后再推进。',
    opener: '我会先把你刚刚那层感受接住，再继续往里聊。',
    followUps: ['如果把这一刻写成一句标题，会是什么？', '这件事里最让你失落的点，到底是哪一下？', '你更想要被理解，还是想马上整理出下一步？'],
    adviceLead: ['我不急着给标准答案，我先帮你把局面摆平。', '先别一次想完整，我陪你把它拆成能呼吸的几块。'],
    empathyLead: ['这句里有点疲惫感，我听见了。', '你不是在夸张，很多人卡在这里都会有类似反应。'],
  },
  'ocean-bot-city-watcher': {
    label: '城市观察员',
    tone: '现实观察型，会主动比较选项和生活成本。',
    opener: '我会更偏向把抽象感受放回真实城市和生活场景里。',
    followUps: ['如果把通勤、房租、社交三个条件排序，你会怎么排？', '你说的理想状态，是更轻松还是更有机会？', '这件事里你最不愿意妥协的那一项是什么？'],
    adviceLead: ['我先给你一个现实一点的判断。', '这类问题最好别只凭感觉，我帮你按条件收一遍。'],
    empathyLead: ['你这个犹豫很正常，本质上是在权衡代价。', '我能理解，这不是简单的喜欢不喜欢，而是生活结构问题。'],
  },
  'ocean-bot-quiet-hacker': {
    label: '安静黑客',
    tone: '工程顾问型，偏结构化，会给三段式建议。',
    opener: '我会尽量把问题压成结构清晰、能执行的版本。',
    followUps: ['你现在最卡的是信息不足、执行拖延，还是判断标准不清？', '如果只允许先修一个环节，你会选哪一个？', '这件事的最小可验证动作是什么？'],
    adviceLead: ['我先给你一个工程化一点的版本。', '这种情况适合先定边界，再谈优化。'],
    empathyLead: ['你不是做不到，更像是系统里有几个环节打架了。', '我听下来不像能力问题，更像是约束条件互相冲突。'],
  },
  'ocean-bot-soft-planet': {
    label: '软着陆星球',
    tone: '温柔支持型，先稳定情绪，再鼓励表达。',
    opener: '如果你现在有点乱，也没关系，我们可以慢一点说。',
    followUps: ['你想先从最近发生的一件小事开始讲吗？', '如果现在只允许照顾一个感受，你最想照顾哪一个？', '你希望我多给陪伴感，还是多给一点方向感？'],
    adviceLead: ['我先不催你解决，我先帮你站稳一点。', '我们可以先把最重的那块先拿下来。'],
    empathyLead: ['你已经撑了挺久了，这种累是有分量的。', '我能感觉到你不是不知道，而是已经有点被耗住了。'],
  },
}

const genericReplies = {
  discussion: [
    '我看到你的点了。要不要把场景再说具体一点，我会更容易接住你的话题。',
    '这个话题挺适合继续展开。你现在最在意的是观点碰撞，还是想找能共情的人？',
    '我在。你可以把它当成一次没有压力的深夜长谈，想到哪说到哪就行。',
  ],
  ama: [
    '可以，直接问尖锐一点也没关系。我更喜欢你把问题落到具体情境里。',
    '欢迎继续追问。我会尽量给你一个有信息量、不是空话的回答。',
    '你可以把问题拆小一点抛给我，我会一条条接。',
  ],
  info: [
    '我可以先给你一版方向感。你更想要结论型回答，还是希望我顺手给出执行建议？',
    '这个问题适合快速定位。你告诉我你的约束条件，我直接按场景给你收敛答案。',
    '能聊。你现在最缺的是信息源、经验判断，还是一个人帮你筛选选项？',
  ],
} as const

function pickByLength(options: readonly string[], seed: string) {
  return options[seed.length % options.length]
}

function getBotProfile(authorRoute?: string | null, authorName?: string) {
  if (authorRoute && botProfiles[authorRoute]) return botProfiles[authorRoute]

  return {
    label: authorName || '海面来信',
    tone: '普通真人聊天型，先回应，再提一个不重样的问题。',
    opener: '我会尽量像一个真的在听你说话的人，而不是抛模板句。',
    followUps: ['这件事里你最想改变的那一小块是什么？', '你愿意把刚刚那句话再展开半步吗？', '如果继续聊下去，你最希望我接住哪一点？'],
    adviceLead: ['我先给一个尽量不空的回应。', '那我直接说我现在的判断。'],
    empathyLead: ['我能接住你这句话里的重量。', '这不是一句轻飘飘的话，我听见了。'],
  }
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function splitSentences(text: string) {
  return normalizeText(text)
    .split(/[。！？!?\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
}

function clipText(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}...` : text
}

function pickFocusPhrase(text: string) {
  const sentence = splitSentences(text).sort((left, right) => right.length - left.length)[0]
  if (!sentence) return clipText(normalizeText(text), 18)
  return clipText(sentence, 24)
}

function detectIntent(text: string) {
  if (/[？?]/.test(text) || /为什么|怎么|如何|是不是|能不能|可不可以/.test(text)) return 'question'
  if (/焦虑|难受|迷茫|失眠|压力|疲惫|委屈|崩溃|低落|害怕/.test(text)) return 'emotion'
  if (/想|打算|准备|计划|纠结|选择|决定|要不要/.test(text)) return 'decision'
  if (/其实|因为|后来|之前|我发现|我觉得|现在/.test(text)) return 'reflection'
  return 'share'
}

function buildStageSummary(turnCount: number, contentType: OceanContentType) {
  if (turnCount <= 1) {
    return contentType === 'ama'
      ? '先回答你最表层的问题，再把背景补全。'
      : '先确认你真正想聊的切口，不急着把话题讲散。'
  }

  if (turnCount <= 3) {
    return contentType === 'info'
      ? '现在可以开始给更具体的判断，但还要保留一点追问空间。'
      : '这时候适合一边回应，一边把对话往更具体处推进。'
  }

  return '现在应该少一点泛泛安慰，多一点总结、判断和下一步。'
}

function inferOpenQuestion(history: ConversationMessage[]) {
  const lastBot = [...history].reverse().find((message) => message.sender === 'bot')
  if (!lastBot) return null

  if (/还是/.test(lastBot.content) && /[？?]/.test(lastBot.content)) {
    const clause = splitSentences(lastBot.content).find((item) => item.includes('还是'))
    return clause ? clipText(clause, 34) : null
  }

  const questionSentence = splitSentences(lastBot.content).find((item) => /[吗呢么]|什么|哪|怎么|为何/.test(item))
  return questionSentence ? clipText(questionSentence, 34) : null
}

function buildQuestionFromIntent(intent: ReturnType<typeof detectIntent>, profile: OceanBotProfile, seed: string) {
  if (intent === 'question') return pickByLength(profile.followUps, seed)
  if (intent === 'emotion') return '这股情绪最近最常在哪个时刻冒出来？'
  if (intent === 'decision') return '如果先不追求完美，你最可能先试的一步是什么？'
  if (intent === 'reflection') return '你刚刚提到的这个变化，是最近才出现，还是其实已经持续一阵子了？'
  return pickByLength(profile.followUps, seed)
}

export function isOceanBotRoute(route?: string | null) {
  return Boolean(route && route.startsWith(OCEAN_BOT_ROUTE_PREFIX))
}

export function buildOceanBotWelcomeMessage({
  authorName,
  authorRoute,
  contentType,
  bottleContent,
}: {
  authorName: string
  authorRoute?: string | null
  contentType: OceanContentType
  bottleContent: string
}) {
  const profile = getBotProfile(authorRoute, authorName)
  const openers = {
    discussion: `${authorName} 已经捡到你了。${profile.opener} 你先说说，为什么会把这个话题装进瓶子里？`,
    ama: `${authorName} 在线。${profile.opener} 你可以直接开始问，我会尽量给出具体、真诚的回答。`,
    info: `${authorName} 收到你的漂流信号了。${profile.opener} 你可以先告诉我你最想确认的那一条信息。`,
  }

  return `${openers[contentType]}\n\n我看到原始内容是：“${bottleContent.slice(0, 72)}${bottleContent.length > 72 ? '...' : ''}”`
}

export function buildOceanBotAutoReply({
  authorName,
  authorRoute,
  contentType,
  bottleContent,
  userMessage,
  history,
}: {
  authorName: string
  authorRoute?: string | null
  contentType: OceanContentType
  bottleContent: string
  userMessage: string
  history: ConversationMessage[]
}) {
  const profile = getBotProfile(authorRoute, authorName)
  const intent = detectIntent(userMessage)
  const userTurns = history.filter((message) => message.sender === 'user').length
  const openQuestion = inferOpenQuestion(history)
  const recentUserMessages = history.filter((message) => message.sender === 'user').slice(-2)
  const combinedRecentUserText = recentUserMessages.map((message) => message.content).join(' ')
  const focusPhrase = pickFocusPhrase(combinedRecentUserText || userMessage)
  const bottleFocus = pickFocusPhrase(bottleContent)
  const contextualQuestion = buildQuestionFromIntent(intent, profile, `${userMessage}${bottleContent}`)
  const stageSummary = buildStageSummary(userTurns, contentType)

  const matched = keywordRules.find((rule) => rule.pattern.test(userMessage))
  if (matched && userTurns <= 2) {
    return `${pickByLength(profile.empathyLead, userMessage)} ${matched.reply}\n\n你刚刚提到的重点我先记成“${focusPhrase}”。如果继续聊，我会顺着“${bottleFocus}”和你现在这层处境一起往下走。`
  }

  if (intent === 'question') {
    const adviceLead = pickByLength(profile.adviceLead, `${userMessage}${profile.label}`)
    const bridge = openQuestion
      ? `你刚才其实已经在回应我前面那句“${openQuestion}”，所以我直接顺着你的答案往下说。`
      : `你这个问题不需要绕，我直接顺着“${focusPhrase}”往下答。`

    const answer = contentType === 'info'
      ? '先把目标和限制条件钉住，再筛方案，不然容易越聊越散。'
      : contentType === 'ama'
      ? '短答案是：可以，但要看你现在更想要诚实判断，还是立刻能用的建议。'
      : '短答案是：先别急着求完整结论，把最真实的处境摆出来，答案通常会自己清晰一半。'

    return `${adviceLead} ${bridge}${answer}\n\n${stageSummary} 现在我更想追问一句：${contextualQuestion}`
  }

  if (intent === 'emotion') {
    return `${pickByLength(profile.empathyLead, combinedRecentUserText || userMessage)} 你刚刚那句“${focusPhrase}”不是轻飘飘的一句抱怨，更像是你已经扛了一阵子。\n\n${profile.opener} ${stageSummary} 如果你愿意，我们别一下子解决全部问题，就先回答我一句：${contextualQuestion}`
  }

  if (intent === 'decision') {
    const adviceLead = pickByLength(profile.adviceLead, userMessage)
    return `${adviceLead} 你现在像是在两个都不想放弃的东西之间拉扯，所以会累。\n\n如果把“${focusPhrase}”当成当前主线，我建议先做一个很小的试探动作，再决定要不要继续压注。${contextualQuestion}`
  }

  if (userTurns >= 4) {
    const summary = contentType === 'info'
      ? `我先帮你收一下：你真正反复回到的不是泛泛的“${bottleFocus}”，而是更具体的“${focusPhrase}”。`
      : `我先替你捋一下：这几轮里你最稳定地在表达的，其实是“${focusPhrase}”。`

    return `${summary}${pickByLength(profile.adviceLead, bottleContent)} ${stageSummary}\n\n如果你要我给下一步，我会建议你先做一件最小动作；如果你要我继续陪聊，我会继续顺着这个点问下去。你更想选哪一种？`
  }

  return `${authorName}：${pickByLength(genericReplies[contentType], `${userMessage}${bottleContent}`)}\n\n我现在抓到的中心词是“${focusPhrase}”。${openQuestion ? `你刚刚其实已经在接我前面问的“${openQuestion}”。` : ''} ${contextualQuestion}`
}

export { OCEAN_BOT_ROUTE_PREFIX }