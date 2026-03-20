'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender?: { name: string; avatar: string | null }
}

interface ChatWindowProps {
  chatType: 'bottle' | 'private'
  chatId: string
  myUserId: string
  sendUrl: string       // API URL to POST new message
  fetchUrl: string      // API URL to GET messages
  onAffinityChange?: (score: number) => void
}

export default function ChatWindow({
  chatType,
  chatId,
  myUserId,
  sendUrl,
  fetchUrl,
  onAffinityChange,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showTyping, setShowTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const realtimeRef = useRef<ReturnType<typeof createClient> | null>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load messages
  useEffect(() => {
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((json) => {
        if (json.messages) setMessages(json.messages)
      })
      .catch(() => setError('消息加载失败'))
  }, [fetchUrl])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Supabase Realtime subscription
  useEffect(() => {
    let client: ReturnType<typeof createClient> | null = null

    fetch('/api/realtime-token')
      .then((r) => r.json())
      .then(({ token }) => {
        if (!token) return
        client = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        )
        realtimeRef.current = client

        client
          .channel(`messages:${chatId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `chat_id=eq.${chatId}`,
            },
            (payload) => {
              const msg = payload.new as Message
              setMessages((prev) => {
                if (prev.find((m) => m.id === msg.id)) return prev
                return [...prev, msg]
              })
            }
          )
          .subscribe()
      })
      .catch(() => {})

    return () => {
      client?.removeAllChannels()
    }
  }, [chatId])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setError('')

    try {
      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || '发送失败')
        return
      }
      setInput('')
      if (json.affinityScore !== undefined) onAffinityChange?.(json.affinityScore)
      // Optimistic: if realtime doesn't deliver, add manually
      if (json.message) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === json.message.id)) return prev
          return [...prev, json.message]
        })
      }
      if (json.autoReply) {
        setShowTyping(true)
        const typingDelay = Math.min(2200, Math.max(900, json.autoReply.content.length * 22))
        window.setTimeout(() => {
          setShowTyping(false)
          setMessages((prev) => {
            if (prev.find((m) => m.id === json.autoReply.id)) return prev
            return [...prev, json.autoReply]
          })
        }, typingDelay)
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-white/40 text-sm py-12">
            还没有消息，快发第一条吧 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === myUserId
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMine
                    ? 'bg-sky-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-white/90 rounded-bl-sm'
                }`}
              >
                {!isMine && msg.sender?.name && (
                  <div className="text-xs text-white/50 mb-1">{msg.sender.name}</div>
                )}
                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-xs mt-1 ${isMine ? 'text-white/60 text-right' : 'text-white/40'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        {showTyping && (
          <div className="flex justify-start">
            <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white/10 text-white/60 text-sm">
              对方正在整理回复...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/20 text-red-300 text-sm text-center">{error}</div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
          rows={1}
          maxLength={500}
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-sky-500 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="shrink-0 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm rounded-xl transition-colors"
        >
          {sending ? '…' : '发送'}
        </button>
      </div>
    </div>
  )
}
