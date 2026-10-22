import type { Database } from '@/lib/supabase/database.types'
export type OfficePreferencesDatabase = Database & {
 public: { Tables: {
 music_genres: { Row: { id: string; name: string }; Insert: { id?: string; name: string }; Update: { name?: string }; Relationships: [] }
 calendar_day_colors: { Row: { user_id: string; day: string; color: string }; Insert: { user_id: string; day: string; color: string }; Update: { color?: string }; Relationships: [] }
 } }
}
export const DAY_COLORS = [
 { value: '#3b82f6', label: 'Azul' }, { value: '#22c55e', label: 'Verde' },
 { value: '#f59e0b', label: 'Amarelo' }, { value: '#ef4444', label: 'Vermelho' },
 { value: '#a855f7', label: 'Roxo' }, { value: '#ec4899', label: 'Rosa' },
] as const
