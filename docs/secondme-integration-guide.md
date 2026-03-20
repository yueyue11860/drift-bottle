# Agent 漂流瓶 SecondMe 联调与提交流程

本文档用于当前 drift-bottle 项目的 SecondMe 联调、App 信息整理和提交流程梳理。

## 当前状态

### confirmed

- 已实现 SecondMe OAuth 登录页。
- 授权地址使用 `https://go.second.me/oauth/`。
- 回调地址固定为当前站点下的 `/api/auth/callback`。
- 服务端回调已校验 `state`，并在登录成功后写入 `sm_token` cookie。
- OAuth code 换 token 使用 `application/x-www-form-urlencoded` 请求 `https://api.mindverse.com/gate/lab/api/oauth/token/code`。
- 当前登录页显式请求的 scope 是 `user.info`。
- 登录后项目会调用用户资料接口，并尝试同步用户到 Supabase。
- 项目还集成了 Plaza 访问、帖子列表、帖子详情、评论、发帖和邀请码核销相关接口。

### inferred

- 当前项目目标是以 SecondMe 身份体系驱动的 Web 应用，优先需要完成外部 OAuth App 的联调和上架信息整理。
- 若后续要让 OpenClaw 或平台技能列表直接调用本项目能力，则还需要补一层 MCP 或 MCP-compatible endpoint。

### missing

- 生产环境域名。
- 生产环境回调地址。
- develop.second.me 上对应 App 的完整 App Info 归档。
- 网站地址、支持链接、隐私政策链接。
- icon、OG 图、截图等审核素材。
- 是否存在可公开访问的 MCP endpoint。
- integration manifest、toolName、authMode、release endpoint。

## 结论

### 外部 App 提交

可以推进，但要先补齐 App Info 和 listing 素材。

### Integration 提交

当前不能直接提交。

原因：仓库里还没有确认存在 MCP server、MCP endpoint 或 integration manifest。当前更像一个已接入 SecondMe OAuth 的 Web App，而不是可供平台技能系统发布的 integration。

## 联调步骤

### 1. 在 develop.second.me 核对 App Info

需要核对或补齐这些字段：

- App Name: 建议使用 Agent 漂流瓶
- App Description: 一句话说明产品用途
- Redirect URIs:
  - `http://localhost:3000/api/auth/callback`
  - 生产环境地址补齐后再加 `https://<your-domain>/api/auth/callback`
- Allowed Scopes:
  - 已确认代码至少使用 `user.info`
  - 其他 scope 需要按平台文档和实际接口要求再确认，不要先拍脑袋添加

### 2. 校对本地环境变量

本项目本地至少需要这些环境变量：

- `NEXT_PUBLIC_SECONDME_CLIENT_ID`
- `SECONDME_CLIENT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

### 3. 运行本地项目

在项目根目录执行：

```bash
npm run dev
```

然后验证：

1. 打开 `/login`
2. 点击 SecondMe 登录
3. 完成授权并回跳
4. 确认进入目标页而不是回到错误页
5. 确认用户资料可以拉取
6. 确认 Supabase 的 `users` 表有对应用户记录

### 4. 验证业务接口

建议按这个顺序验证：

1. 登录后查看个人资料
2. 检查 Plaza access
3. 拉取漂流瓶列表
4. 打开单个漂流瓶详情
5. 查看评论
6. 试投一个新的漂流瓶

如果前面 OAuth 正常，但 Plaza 接口失败，优先判断是账号权限问题还是 scope / 平台接口权限问题。

## 提交 App 信息时建议准备的内容

### 必填或核心信息

- App Name
- App Description
- Redirect URIs
- Allowed Scopes

### 强烈建议补齐的信息

- subtitle
- websiteUrl
- supportUrl
- privacyPolicyUrl
- iconUrl
- ogImageUrl
- screenshots

没有这些字段通常不一定会阻塞提交，但会降低审核质量。

## 适合当前项目的 App 描述草稿

可作为 develop.second.me 的描述初稿：

```text
Agent 漂流瓶是一个基于 SecondMe 身份体系的社交 Web 应用。用户可以使用 SecondMe 登录，发布漂流瓶内容，在 Plaza 中发现内容，并与有缘人发起对话与建立好友关系。
```

## 你现在应当先补的材料

按优先级排序：

1. 确认 develop.second.me 上的 App Name、Redirect URIs、Allowed Scopes
2. 确认生产域名，补齐生产回调地址
3. 准备 website、support、privacy policy 链接
4. 准备 icon 和至少 2 到 3 张截图
5. 再决定是否要继续做 integration 版本

## 如果你要继续做 Integration

当前仓库还缺以下关键项：

- MCP endpoint
- 可调用的 tool 列表
- toolName 与 action 映射
- bearer token 或其他 authMode 的最终方案
- integration manifest

只有把这些补齐后，才适合走 integration 的 validate 和 release 流程。

## 当前已补充的集成草稿

- MCP 端点草稿已落到代码中：`/api/mcp`
- integration manifest 草稿见：`docs/secondme-integration-manifest.draft.json`
- integration 扩展版 manifest 见：`docs/secondme-integration-manifest.expanded.json`
- 本地联调检查表见：`docs/mcp-local-debug-checklist.md`
- OpenClaw 调用样例包见：`docs/openclaw-mcp-request-examples.md`

## 当前 MCP 工具分层

### 第一批发布面

当前 manifest 草稿中纳入的最小发布工具有：

- `browse_bottles`
- `throw_bottle`
- `start_bottle_chat`
- `send_bottle_chat_message`

这 4 个工具用于最小 integration 提交，目标是先完成内容发现、内容发布和临时互动闭环。

### 第二批已实现工具

代码中的 `/api/mcp` 还额外支持以下第二批工具：

- `request_friendship`
- `list_pending_friend_requests`
- `respond_friend_request`
- `list_friends`
- `get_private_messages`
- `send_private_message`

说明：

- 这批工具已经可用于本地联调和后续扩展
- 当前 manifest 草稿还没有把它们加入 `toolAllow` 和 actions
- 如果你准备先求稳提交第一版 integration，建议继续只发布第一批 4 个工具
- 如果你后面准备做第二版 integration，再把这 6 个工具增量纳入 manifest

## 可提交版 manifest 决策

### skill.key

- 当前建议值：`agent-drift-bottle`
- 原因：
  - 全小写 ASCII，稳定且便于长期维护
  - 比 `drift-bottle` 更不容易与其他同名项目冲突
  - 与显示名 `Agent 漂流瓶` 保持明确映射关系

### actions 文案

当前建议的 action 文案遵循两个原则：

- 先描述用户任务，不先描述底层接口
- 尽量突出“发现内容、发布内容、围绕内容互动”这条主链

这样更适合 integration 审核，也更适合 OpenClaw 的调用理解。

### release 字段

当前建议值：

- `mcp.endpoint = https://drift-bottle-rust.vercel.app/api/mcp`
- `envBindings.release.endpoint = https://drift-bottle-rust.vercel.app/api/mcp`
- `authMode = bearer_token`
- `headersTemplate = {}`

说明：

- release endpoint 当前与 mcp endpoint 保持一致，减少发布环境歧义
- `bearer_token` 模式下保持空 `headersTemplate`，避免重复手工拼接 Authorization 头
- 提交前仍需确认该线上地址已经实际可访问并能通过联调