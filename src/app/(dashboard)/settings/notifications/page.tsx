import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NotificationPreferences } from '@/components/settings/NotificationPreferences'
import { createDefaultPreferences } from '@/lib/notifications/defaults'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default async function NotificationsSettingsPage() {
  const supabase = await createServerSupabaseClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load user preferences
  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('[NotificationsPage] Error loading preferences:', error)
  }

  // If user has no preferences, create defaults
  if (!preferences || preferences.length === 0) {
    console.log('[NotificationsPage] Creating default preferences for user:', user.id)
    await createDefaultPreferences(user.id)

    // Reload preferences
    const { data: newPreferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)

    return (
      <div className="container mx-auto py-8 px-4">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/settings">Configurações</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Notificações</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <NotificationPreferences userId={user.id} initialPreferences={newPreferences || []} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings">Configurações</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Notificações</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <NotificationPreferences userId={user.id} initialPreferences={preferences} />
    </div>
  )
}
