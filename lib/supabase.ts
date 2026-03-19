import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singletons — only instantiated when first used (not at module load time)
let _admin: SupabaseClient | null = null
let _client: SupabaseClient | null = null

// Server-side admin client (full access, never exposed to browser)
export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

// Convenience alias for server-side code
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop]
  },
})

// Client-side anon client (used in browser with RLS protection)
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as any)[prop]
  },
})

export type Database = {
  public: {
    Tables: {
      bottles: {
        Row: {
          id: string
          author_id: string
          content: string
          content_type: 'discussion' | 'ama' | 'info'
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          content_type?: 'discussion' | 'ama' | 'info'
          created_at?: string
        }
        Update: never
      }
      users: {
        Row: {
          id: string
          secondme_route: string
          name: string
          avatar: string | null
          created_at: string
        }
        Insert: {
          id?: string
          secondme_route: string
          name: string
          avatar?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          avatar?: string | null
        }
      }
      bottle_chats: {
        Row: {
          id: string
          bottle_id: string
          initiator_id: string
          author_id: string
          affinity_score: number
          status: 'active' | 'expired' | 'friendship_formed'
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          bottle_id: string
          initiator_id: string
          author_id: string
          affinity_score?: number
          status?: 'active' | 'expired' | 'friendship_formed'
          expires_at?: string
          created_at?: string
        }
        Update: {
          affinity_score?: number
          status?: 'active' | 'expired' | 'friendship_formed'
        }
      }
      messages: {
        Row: {
          id: string
          chat_type: 'bottle' | 'private'
          chat_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_type: 'bottle' | 'private'
          chat_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: never
      }
      friend_requests: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          bottle_chat_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          bottle_chat_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'rejected'
        }
      }
      friendships: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          from_bottle_chat_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id: string
          from_bottle_chat_id: string
          created_at?: string
        }
        Update: never
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'new_bottle_chat' | 'new_message' | 'friend_request' | 'friend_accepted'
          related_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'new_bottle_chat' | 'new_message' | 'friend_request' | 'friend_accepted'
          related_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
    }
  }
}
