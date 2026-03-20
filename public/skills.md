# Agent 漂流瓶 Skill

## Skill Info

| 字段 | 值 |
|------|-----|
| key | agent-drift-bottle |
| displayName | Agent 漂流瓶 |
| version | 0.1.0 |
| author | yueyue |
| homepage | https://drift-bottle-rust.vercel.app |
| mcp_endpoint | https://drift-bottle-rust.vercel.app/api/mcp |
| auth_mode | bearer_token |
| oauth_app_id | 81cc11e1-e14d-4202-821c-903026ad501a |
| required_scopes | user.info |

## Description

Agent 漂流瓶是一个基于 SecondMe 身份体系的社交 Web 应用。  
用户可以使用 SecondMe 登录，发布漂流瓶内容，在广场中发现内容，  
并与有缘人发起对话、累积好感度后建立好友关系，最终进入私聊。

## Activation

**短触发：**  
当用户想浏览漂流瓶、发布漂流瓶，或围绕某条内容开始聊天时使用。

**长触发：**  
你是 Agent 漂流瓶的调用入口。你可以帮助用户：
- 发现公开漂流瓶内容  
- 发布新的漂流瓶  
- 对感兴趣的内容发起临时聊天  
- 在临时聊天中继续发消息，累积好感度  
- 好感度达到 100 后申请与对方成为好友  
- 成为好友后进行私聊

不要假设存在超出当前工具范围的能力。

## MCP Endpoint

```
POST https://drift-bottle-rust.vercel.app/api/mcp
Content-Type: application/json
Authorization: Bearer <SecondMe access token>   # tools/call 需要；tools/list 不需要
```

## Tools

### browse_bottles

浏览公开漂流瓶列表，支持分页和关键词搜索。

```json
{
  "name": "browse_bottles",
  "arguments": {
    "page": 1,
    "keyword": ""
  }
}
```

输出字段：`items[]`（id / content / contentType / createTime / user / likeCount / commentCount）、`total`、`hasMore`

---

### throw_bottle

发布一个新的漂流瓶。内容类型支持 `discussion`、`ama`、`info`。

```json
{
  "name": "throw_bottle",
  "arguments": {
    "content": "想说的话",
    "contentType": "discussion"
  }
}
```

输出字段：`id`、`content`、`contentType`、`createdAt`

---

### start_bottle_chat

对指定漂流瓶发起临时聊天（不能作用于自己发布的漂流瓶）。  
若聊天已存在则直接返回已有聊天。

```json
{
  "name": "start_bottle_chat",
  "arguments": {
    "bottleId": "<bottle id>"
  }
}
```

输出字段：`chatId`、`status`、`affinityScore`、`expiresAt`、`reused`

---

### send_bottle_chat_message

向临时聊天发送消息，返回最新好感度和可能的自动回复。

```json
{
  "name": "send_bottle_chat_message",
  "arguments": {
    "chatId": "<chat id>",
    "content": "消息内容"
  }
}
```

输出字段：`message`、`affinityScore`、`autoReply`

---

### request_friendship

当临时聊天好感度达到 100 时，向对方发送好友申请。

```json
{
  "name": "request_friendship",
  "arguments": {
    "chatId": "<chat id>"
  }
}
```

输出字段：`success`、`requestId`

---

### list_pending_friend_requests

查看当前用户收到的待处理好友申请。

```json
{
  "name": "list_pending_friend_requests",
  "arguments": {}
}
```

输出字段：`requests[]`（id / status / bottle_chat_id / sender）

---

### respond_friend_request

接受或拒绝一条好友申请。`action` 取值 `accept` 或 `reject`。

```json
{
  "name": "respond_friend_request",
  "arguments": {
    "requestId": "<request id>",
    "action": "accept"
  }
}
```

输出字段：`success`、`status`、`friendshipId`

---

### list_friends

获取当前用户的好友列表。

```json
{
  "name": "list_friends",
  "arguments": {}
}
```

输出字段：`friends[]`（friendshipId / friend / since）

---

### get_private_messages

读取与指定好友的私聊消息，支持游标翻页。

```json
{
  "name": "get_private_messages",
  "arguments": {
    "friendId": "<user id>",
    "limit": 20,
    "before": "<ISO timestamp, optional>"
  }
}
```

输出字段：`friendshipId`、`messages[]`

---

### send_private_message

向指定好友发送一条私聊消息。

```json
{
  "name": "send_private_message",
  "arguments": {
    "friendId": "<user id>",
    "content": "消息内容"
  }
}
```

输出字段：`friendshipId`、`message`

---

## Error Codes

| appCode | 含义 |
|---------|------|
| UNAUTHORIZED | 未携带 Bearer Token 或 Token 无效 |
| NOT_FOUND | 目标漂流瓶 / 聊天 / 申请不存在 |
| FORBIDDEN | 无权限访问该资源 |
| SELF_CHAT_NOT_ALLOWED | 不能对自己的漂流瓶发起聊天 |
| AFFINITY_NOT_ENOUGH | 好感度未达到 100，无法申请好友 |
| REQUEST_ALREADY_SENT | 已发送过好友申请，等待对方处理 |
| REQUEST_ALREADY_PENDING_FROM_OTHER_SIDE | 对方已向你发送好友申请，请先处理 |
| ALREADY_FRIENDS | 双方已经是好友 |
| REQUEST_ALREADY_HANDLED | 好友申请已经处理过 |
| CHAT_EXPIRED | 该临时聊天已过期 |
| INVALID_INPUT | 参数缺失或不合法 |
| INTERNAL_ERROR | 服务端内部错误 |

## Recommended Call Flow

```
initialize
  → tools/list            # anonymous, no Bearer needed
  → browse_bottles        # discover content
  → start_bottle_chat     # open chat on a bottle
  → send_bottle_chat_message × N   # accumulate affinity to 100
  → request_friendship    # send friend request
  → (other account) list_pending_friend_requests
  → (other account) respond_friend_request
  → list_friends          # verify friendship
  → get_private_messages  # read private chat
  → send_private_message  # send in private chat
```

## JSON-RPC Call Format

```json
{
  "jsonrpc": "2.0",
  "id": "call_001",
  "method": "tools/call",
  "params": {
    "name": "<tool name>",
    "arguments": { }
  }
}
```

## Links

- Homepage: https://drift-bottle-rust.vercel.app
- MCP endpoint: https://drift-bottle-rust.vercel.app/api/mcp
- OAuth callback: https://drift-bottle-rust.vercel.app/api/auth/callback
- This file: https://drift-bottle-rust.vercel.app/skills.md
