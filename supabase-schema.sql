-- ==============================
-- 漂流瓶社交功能数据库 Schema
-- 在 Supabase SQL Editor 中执行
-- ==============================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================
-- 用户表
-- ==================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondme_route TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================
-- 漂流瓶表
-- ==================
CREATE TABLE IF NOT EXISTS bottles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  content_type TEXT NOT NULL DEFAULT 'discussion' CHECK (content_type IN ('discussion', 'ama', 'info')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bottles_created ON bottles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bottles_author ON bottles (author_id);

-- ==================
-- 漂流瓶临时聊天表
-- ==================
CREATE TABLE IF NOT EXISTS bottle_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_id TEXT NOT NULL,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affinity_score INTEGER NOT NULL DEFAULT 0 CHECK (affinity_score >= 0 AND affinity_score <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'friendship_formed')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bottle_id, initiator_id)
);

-- ==================
-- 消息表（临时聊天 + 私聊复用）
-- ==================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type TEXT NOT NULL CHECK (chat_type IN ('bottle', 'private')),
  chat_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_type, chat_id, created_at);

-- ==================
-- 好友申请表
-- ==================
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bottle_chat_id UUID NOT NULL REFERENCES bottle_chats(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id)
);

-- ==================
-- 好友关系表（user1_id < user2_id 防重）
-- ==================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_bottle_chat_id UUID NOT NULL REFERENCES bottle_chats(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

-- ==================
-- 通知表
-- ==================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_bottle_chat', 'new_message', 'friend_request', 'friend_accepted')),
  related_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- ==============================
-- Row Level Security (RLS)
-- ==============================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 服务端使用 service_role 绕过 RLS，以下仅为客户端实时订阅准备
-- 客户端用 anon key + 自定义 JWT (sub=user_id) 订阅自己相关的 messages

-- messages 表：仅聊天参与者可 SELECT（Realtime 使用）
-- 使用 IN 子查询避免 EXISTS 中列名歧义
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT USING (
    sender_id::text = auth.uid()::text
    OR chat_id IN (
      SELECT id FROM bottle_chats
      WHERE initiator_id::text = auth.uid()::text
         OR author_id::text = auth.uid()::text
    )
    OR chat_id IN (
      SELECT id FROM friendships
      WHERE user1_id::text = auth.uid()::text
         OR user2_id::text = auth.uid()::text
    )
  );

-- notifications 仅本人可读
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id::text = auth.uid()::text);

-- Realtime 发布消息变更
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
