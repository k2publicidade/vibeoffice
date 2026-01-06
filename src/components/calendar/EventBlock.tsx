'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Attendee {
  id: string
  name: string
  avatar?: string
}

interface EventBlockProps {
  event: {
    id: string
    title: string
    startTime: Date
    endTime: Date
    color?: string
    attendees?: Attendee[]
  }
  onClick?: () => void
  compact?: boolean
}

export function EventBlock({ event, onClick, compact = false }: EventBlockProps) {
  const bgColor = event.color || 'hsl(var(--secondary))'
  const timeRange = `${format(event.startTime, 'HH:mm')} - ${format(
    event.endTime,
    'HH:mm'
  )}`

  if (compact) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-lg p-2 text-left text-xs transition-shadow"
        style={{
          backgroundColor: bgColor,
          color: 'white',
          boxShadow: `0 4px 12px ${bgColor}40`
        }}
      >
        <p className="font-medium truncate">{event.title}</p>
        <p className="opacity-80">{timeRange}</p>
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{
        scale: 1.02,
        y: -2,
        boxShadow: `0 8px 24px ${bgColor}50`
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        'w-full h-full rounded-xl p-3 text-left cursor-pointer',
        'flex flex-col backdrop-blur-sm'
      )}
      style={{
        backgroundColor: bgColor,
        color: 'white',
        boxShadow: `0 4px 12px ${bgColor}30`
      }}
    >
      <p className="font-semibold text-sm truncate">{event.title}</p>
      <p className="text-xs opacity-80 mt-0.5 font-medium">{timeRange}</p>

      {event.attendees && event.attendees.length > 0 && (
        <div className="mt-auto pt-2 flex -space-x-1.5">
          {event.attendees.slice(0, 3).map((attendee, index) => (
            <motion.div
              key={attendee.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Avatar className="h-6 w-6 border-2 border-white/30 ring-1 ring-white/10">
                <AvatarImage src={attendee.avatar} alt={attendee.name} />
                <AvatarFallback className="bg-white/20 text-[10px] text-white font-semibold">
                  {attendee.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
          {event.attendees.length > 3 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-[10px] font-semibold"
            >
              +{event.attendees.length - 3}
            </motion.div>
          )}
        </div>
      )}
    </motion.button>
  )
}
