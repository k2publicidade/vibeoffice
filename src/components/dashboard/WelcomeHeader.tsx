'use client'

import { useSession } from 'next-auth/react'
import { ArrowRight, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface WelcomeHeaderProps {
  onNewRequest?: () => void
  onScheduleMeeting?: () => void
}

export function WelcomeHeader({ onNewRequest, onScheduleMeeting }: WelcomeHeaderProps) {
  const { data: session } = useSession()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'Usuário'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          <span className="italic">{getGreeting()}, {firstName}</span>{' '}
          <span className="not-italic">☕</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* New Request - Black button */}
        <Button
          variant="outline"
          className="rounded-full bg-black text-white border-0 hover:bg-black/90 font-medium px-6 h-11 transition-all hover:scale-105 hover:shadow-lg"
          onClick={onNewRequest}
        >
          Nova solicitação
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        {/* Schedule Meeting - High Contrast Red button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            className="rounded-full bg-[#ff0300] text-white hover:bg-[#ff0300]/90 font-semibold px-6 h-11 transition-all shadow-[0_4px_15px_rgba(255,3,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,3,0,0.4)] border-0"
            onClick={onScheduleMeeting}
          >
            <Users className="mr-2 h-4 w-4" />
            Agendar reunião
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

