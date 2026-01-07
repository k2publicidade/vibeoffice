'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NotificationMetadata, CHANNEL_LABELS } from '@/lib/notifications/metadata'
import { NotificationType } from '@/types/notifications'
import { Info } from 'lucide-react'
import { ChannelType } from '@/hooks/useNotificationPreferences'

interface NotificationCategoryCardProps {
  title: string
  icon: string
  notifications: NotificationMetadata[]
  preferences: Record<string, { inApp: boolean; push: boolean; email: boolean }>
  onToggle: (type: NotificationType, channel: ChannelType, value: boolean) => void
  saving: boolean
}

export function NotificationCategoryCard({
  title,
  icon,
  notifications,
  preferences,
  onToggle,
  saving,
}: NotificationCategoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Tipo</TableHead>
              <TableHead className="w-[20%] text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-1 cursor-help">
                        <span>{CHANNEL_LABELS.inApp.icon}</span>
                        <span className="hidden sm:inline">{CHANNEL_LABELS.inApp.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{CHANNEL_LABELS.inApp.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-[20%] text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-1 cursor-help">
                        <span>{CHANNEL_LABELS.push.icon}</span>
                        <span className="hidden sm:inline">{CHANNEL_LABELS.push.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{CHANNEL_LABELS.push.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-[20%] text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-1 cursor-help">
                        <span>{CHANNEL_LABELS.email.icon}</span>
                        <span className="hidden sm:inline">{CHANNEL_LABELS.email.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{CHANNEL_LABELS.email.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notif) => {
              const pref = preferences[notif.type]
              if (!pref) return null

              return (
                <TableRow key={notif.type}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{notif.label}</div>
                      <div className="text-sm text-muted-foreground">{notif.description}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={pref.inApp}
                      onCheckedChange={(checked) => onToggle(notif.type, 'inApp', checked)}
                      disabled={notif.channels.inApp.locked || saving}
                      aria-label={`${notif.label} - In-App`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={pref.push}
                      onCheckedChange={(checked) => onToggle(notif.type, 'push', checked)}
                      disabled={notif.channels.push.locked || saving}
                      aria-label={`${notif.label} - Push`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={pref.email}
                        onCheckedChange={(checked) => onToggle(notif.type, 'email', checked)}
                        disabled={notif.channels.email.locked || saving}
                        className={notif.channels.email.locked ? 'opacity-50 cursor-not-allowed' : ''}
                        aria-label={`${notif.label} - Email`}
                      />
                      {notif.channels.email.locked && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mensagens de chat não enviam notificações por email</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
