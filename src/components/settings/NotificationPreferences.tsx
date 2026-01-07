'use client'

import { NotificationPreference } from '@/types/notifications'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { NotificationCategoryCard } from './NotificationCategoryCard'
import { getMetadataByCategory, CATEGORY_LABELS } from '@/lib/notifications/metadata'

interface NotificationPreferencesProps {
  userId: string
  initialPreferences: NotificationPreference[]
}

export function NotificationPreferences({ userId, initialPreferences }: NotificationPreferencesProps) {
  const { preferences, updatePreference, saving } = useNotificationPreferences(userId, initialPreferences)

  const categories: Array<keyof typeof CATEGORY_LABELS> = ['tasks', 'tickets', 'chat', 'general']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Preferências de Notificação</h1>
        <p className="text-muted-foreground mt-2">
          Controle como e quando você recebe notificações no VibeOffice
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((category) => {
          const categoryData = CATEGORY_LABELS[category]
          const notifications = getMetadataByCategory(category)

          return (
            <NotificationCategoryCard
              key={category}
              title={categoryData.label}
              icon={categoryData.icon}
              notifications={notifications}
              preferences={preferences}
              onToggle={updatePreference}
              saving={saving}
            />
          )
        })}
      </div>
    </div>
  )
}
