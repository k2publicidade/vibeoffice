export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          type: Database["public"]["Enums"]["event_type"]
          sector: Database["public"]["Enums"]["sector_type"] | null
          location: string | null
          attendees: string[]
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          type: Database["public"]["Enums"]["event_type"]
          sector?: Database["public"]["Enums"]["sector_type"] | null
          location?: string | null
          attendees?: string[]
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          type?: Database["public"]["Enums"]["event_type"]
          sector?: Database["public"]["Enums"]["sector_type"] | null
          location?: string | null
          attendees?: string[]
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_rooms: {
        Row: {
          id: string
          name: string
          type: Database["public"]["Enums"]["room_type"]
          sector: Database["public"]["Enums"]["sector_type"] | null
          participants: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: Database["public"]["Enums"]["room_type"]
          sector?: Database["public"]["Enums"]["sector_type"] | null
          participants?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["room_type"]
          sector?: Database["public"]["Enums"]["sector_type"] | null
          participants?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          id: string
          user_id: string
          course_id: string
          completed_lessons: string[]
          progress: number
          last_accessed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          completed_lessons?: string[]
          progress?: number
          last_accessed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          completed_lessons?: string[]
          progress?: number
          last_accessed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string
          instructor: string
          thumbnail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          instructor: string
          thumbnail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          instructor?: string
          thumbnail?: string | null
          created_at?: string
        }
        Relationships: []
      }
      drive_items: {
        Row: {
          id: string
          name: string
          type: Database["public"]["Enums"]["item_type"]
          parent_id: string | null
          sector: Database["public"]["Enums"]["sector_type"] | null
          size: number | null
          mime_type: string | null
          storage_path: string | null
          uploaded_by: string
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: Database["public"]["Enums"]["item_type"]
          parent_id?: string | null
          sector?: Database["public"]["Enums"]["sector_type"] | null
          size?: number | null
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["item_type"]
          parent_id?: string | null
          sector?: Database["public"]["Enums"]["sector_type"] | null
          size?: number | null
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "drive_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_items_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      lessons: {
        Row: {
          id: string
          course_id: string
          title: string
          content: string
          video_url: string | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          content: string
          video_url?: string | null
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          content?: string
          video_url?: string | null
          order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          content: string
          type: Database["public"]["Enums"]["message_type"]
          timestamp: string
          reactions: Json
          mentioned_users: string[]
          read_by: Json
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          content: string
          type?: Database["public"]["Enums"]["message_type"]
          timestamp?: string
          reactions?: Json
          mentioned_users?: string[]
          read_by?: Json
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          content?: string
          type?: Database["public"]["Enums"]["message_type"]
          timestamp?: string
          reactions?: Json
          mentioned_users?: string[]
          read_by?: Json
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          priority: Database["public"]["Enums"]["notification_priority"]
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          entity_id: string | null
          metadata: Json
          read: boolean
          read_at: string | null
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          entity_id?: string | null
          metadata?: Json
          read?: boolean
          read_at?: string | null
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          entity_id?: string | null
          metadata?: Json
          read?: boolean
          read_at?: string | null
          archived?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          enable_in_app: boolean
          enable_push: boolean
          enable_email: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          enable_in_app?: boolean
          enable_push?: boolean
          enable_email?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          enable_in_app?: boolean
          enable_push?: boolean
          enable_email?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
          last_used_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
          last_used_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
          last_used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      shared_access: {
        Row: {
          id: string
          item_id: string
          user_id: string
          permission: Database["public"]["Enums"]["share_permission"]
          shared_by: string
          shared_at: string
        }
        Insert: {
          id?: string
          item_id: string
          user_id: string
          permission?: Database["public"]["Enums"]["share_permission"]
          shared_by: string
          shared_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          user_id?: string
          permission?: Database["public"]["Enums"]["share_permission"]
          shared_by?: string
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_access_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "drive_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_access_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: Database["public"]["Enums"]["task_status"]
          priority: Database["public"]["Enums"]["priority_type"]
          due_date: string | null
          assigned_to: string | null
          sector: Database["public"]["Enums"]["sector_type"]
          created_by: string
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          priority?: Database["public"]["Enums"]["priority_type"]
          due_date?: string | null
          assigned_to?: string | null
          sector: Database["public"]["Enums"]["sector_type"]
          created_by: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          priority?: Database["public"]["Enums"]["priority_type"]
          due_date?: string | null
          assigned_to?: string | null
          sector?: Database["public"]["Enums"]["sector_type"]
          created_by?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_comments: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          content: string
          is_internal: boolean
          attachments: string[]
          created_at: string
          updated_at: string | null
          edited_by: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          content: string
          is_internal?: boolean
          attachments?: string[]
          created_at?: string
          updated_at?: string | null
          edited_by?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          content?: string
          is_internal?: boolean
          attachments?: string[]
          created_at?: string
          updated_at?: string | null
          edited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_history: {
        Row: {
          id: string
          ticket_id: string
          action: string
          changed_by: string
          previous_value: string | null
          new_value: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          ticket_id: string
          action: string
          changed_by: string
          previous_value?: string | null
          new_value?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          action?: string
          changed_by?: string
          previous_value?: string | null
          new_value?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          status: Database["public"]["Enums"]["ticket_status"]
          priority: Database["public"]["Enums"]["priority_type"]
          requester: string
          created_by: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: string
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["priority_type"]
          requester: string
          created_by?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["priority_type"]
          requester?: string
          created_by?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_requester_fkey"
            columns: ["requester"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_chat_preferences: {
        Row: {
          id: string
          user_id: string
          room_id: string
          is_archived: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          room_id: string
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          room_id?: string
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chat_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_chat_preferences_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          avatar: string | null
          sector: Database["public"]["Enums"]["sector_type"]
          role: Database["public"]["Enums"]["role_type"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          avatar?: string | null
          sector: Database["public"]["Enums"]["sector_type"]
          role?: Database["public"]["Enums"]["role_type"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          avatar?: string | null
          sector?: Database["public"]["Enums"]["sector_type"]
          role?: Database["public"]["Enums"]["role_type"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      entity_type: "task" | "ticket" | "message"
      event_type: "personal" | "sector" | "company"
      item_type: "file" | "folder"
      message_type: "text" | "image" | "file"
      notification_priority: "low" | "medium" | "high"
      notification_type:
        | "task_assigned"
        | "task_status_changed"
        | "task_comment_added"
        | "task_due_soon"
        | "ticket_created"
        | "ticket_assigned"
        | "ticket_status_changed"
        | "ticket_comment_added"
        | "message_received"
        | "mentioned_in_chat"
        | "announcement"
      priority_type: "low" | "medium" | "high"
      role_type: "Admin" | "Gerente" | "Colaborador"
      room_type: "sector" | "dm"
      sector_type:
        | "A&R"
        | "Marketing"
        | "Financeiro"
        | "Jurídico"
        | "Administrativo"
        | "TI/Suporte"
        | "Atendimento ao Artista"
      share_permission: "view" | "edit" | "manage"
      task_status: "todo" | "in_progress" | "done"
      ticket_status: "open" | "analyzing" | "in_progress" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never
