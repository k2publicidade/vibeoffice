'use client'

import { Clock, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StripeGradientShader } from '@/components/ui/stripe-like-gradient-shader'

interface Attendee {
  id: string
  name: string
  avatar?: string
}

interface MeetingCardProps {
  title: string
  startsIn: string
  time: string
  duration: string
  attendees: Attendee[]
  onJoin?: () => void
}

export function MeetingCard({
  title,
  startsIn,
  time,
  duration,
  attendees,
  onJoin,
}: MeetingCardProps) {
  return (
    <div className="relative bg-zinc-950/90 text-white rounded-[20px] h-full flex flex-col transition-all overflow-hidden group border border-white/5">
      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
        <StripeGradientShader className="h-full w-full" />
      </div>

      <div className="relative z-10 flex flex-col h-full p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-tight">{title}</h3>
            <p className="text-sm text-white/60">
              {startsIn}, {time}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-white/60 shrink-0">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2">
          {/* Attendees */}
          <div className="flex -space-x-2">
            {attendees.slice(0, 4).map((attendee, index) => (
              <Avatar
                key={attendee.id}
                className="h-9 w-9 border-2 border-black ring-0"
                style={{ zIndex: attendees.length - index }}
              >
                <AvatarImage src={attendee.avatar} alt={attendee.name} />
                <AvatarFallback className="bg-gradient-to-br from-[#ff0300] to-[#fc7a67] text-white text-xs font-medium">
                  {attendee.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
            ))}
            {attendees.length > 4 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white/10 text-xs font-medium">
                +{attendees.length - 4}
              </div>
            )}
          </div>

          {/* Join button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              className="relative group/btn rounded-full bg-white text-black border-0 hover:bg-white/90 font-semibold px-6 h-11 transition-all overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,3,0,0.4)]"
              onClick={onJoin}
            >
              <span className="relative z-10 flex items-center gap-2">
                Entrar agora
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </span>

              {/* Subtle hover glow background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
