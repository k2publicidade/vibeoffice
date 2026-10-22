import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
export type ReleaseOperationsDatabase=Database & { public: { Functions: {
 release_operations_snapshot: { Args: Record<string, never>; Returns: Json }
 change_release_distribution: { Args: {p_release_id:string;p_action:string;p_payload:Json}; Returns: Json }
 import_release_performance: { Args: {p_release_id:string;p_rows:Json;p_source:string}; Returns: Json }
} } }
export type ReleaseOperationsClient=SupabaseClient<ReleaseOperationsDatabase>
