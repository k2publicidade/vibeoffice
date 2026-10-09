import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/client'
import { NOTIFICATION_METADATA } from './metadata'
import { NotificationType } from '@/types/notifications'

/**
 * Creates default notification preferences for a new user (Server-side)
 * Based on NOTIFICATION_METADATA defaults
 */
export async function createDefaultPreferences(userId: string) {
  const supabase = await createServerSupabaseClient()

  // Build preferences array from metadata
  const preferences = Object.values(NOTIFICATION_METADATA).map((meta) => ({
    user_id: userId,
    notification_type: meta.type as NotificationType,
    enable_in_app: meta.channels.inApp.enabled,
    enable_push: meta.channels.push.enabled,
    enable_email: meta.channels.email.enabled,
  }))

  const { error } = await supabase.from('notification_preferences').upsert(preferences, { onConflict: 'user_id,notification_type', ignoreDuplicates: true })

  if (error) {
    console.error('[createDefaultPreferences] Error creating defaults:', error)
    throw error
  }

  console.log(`[createDefaultPreferences] Created ${preferences.length} default preferences for user ${userId}`)
}

/**
 * Creates default notification preferences for a new user (Client-side)
 * Based on NOTIFICATION_METADATA defaults
 */
export async function createDefaultPreferencesClient(userId: string) {
  const supabase = createClient()

  // Build preferences array from metadata
  const preferences = Object.values(NOTIFICATION_METADATA).map((meta) => ({
    user_id: userId,
    notification_type: meta.type as NotificationType,
    enable_in_app: meta.channels.inApp.enabled,
    enable_push: meta.channels.push.enabled,
    enable_email: meta.channels.email.enabled,
  }))

  const { error } = await supabase.from('notification_preferences').upsert(preferences, { onConflict: 'user_id,notification_type', ignoreDuplicates: true })

  if (error) {
    console.error('[createDefaultPreferencesClient] Error creating defaults:', error)
    throw error
  }

  console.log(`[createDefaultPreferencesClient] Created ${preferences.length} default preferences for user ${userId}`)
}
